import * as fs from 'fs-extra';
import * as imageDataUri from 'image-data-uri';
import parseDataUrl from 'parse-data-url';
import * as path from 'path';
import { Accessor, Animation, AnimationChannel,
    BufferView, GlTf, Image, Material, Mesh, Node, Scene, Skin, Texture } from '../../../../../../@types/asset-db/glTF';
import { AttributeBaseType, AttributeType, IMeshStruct,
    IndexUnit, IPrimitive, IVertexAttribute, IVertexBundle } from '../mesh';
import { Filter, TextureBaseAssetUserData, WrapMode } from '../texture-base';

export interface GltfImageUriInfo {
    isDataUri: boolean;
}

export interface GltfImagePathInfo extends GltfImageUriInfo {
    fullPath: string;
}

export function isFilesystemPath(uriInfo: GltfImageUriInfo): uriInfo is GltfImagePathInfo {
    return !uriInfo.isDataUri;
}

export interface IGltfAssetTable {
    meshes?: Array<string | null>;
    animations?: Array<string | null>;
    skeletons?: Array<string | null>;
    images?: Array<{
        uuidOrDatabaseUri: string,
        embeded: boolean,
    } | null>;
    textures?: Array<string | null>;
    materials?: Array<string | null>;
}

// @ts-ignore
export type AssetLoader = (uuid: string) => cc.Asset;

export type GltfSubAsset = Node | Mesh | Texture | Skin | Animation | Image | Material | Scene;

enum GltfAssetKind {
    Node,
    Mesh,
    Texture,
    Skin,
    Animation,
    Image,
    Material,
    Scene,
}

export class GltfConverter {
    private _nodePathTable: string[] | null = null;

    constructor(
        private _gltf: GlTf,
        private _buffers: Buffer[],
        private _gltfFilePath: string,
        private _assetLoader: AssetLoader) {
        this._nodePathTable = this._createNodePathTable();
    }

    get gltf() {
        return this._gltf;
    }

    get path() {
        return this._gltfFilePath;
    }

    public createMesh(iGltfMesh: number) {
        const gltfMesh = this._gltf.meshes![iGltfMesh];
        const bufferBlob = new BufferBlob();

        // @ts-ignore
        const minPosition = new cc.Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        // @ts-ignore
        const maxPosition = new cc.Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

        const vertexBundles = new Array<IVertexBundle>();
        const primitives = gltfMesh.primitives.map((gltfPrimitive, primitiveIndex): IPrimitive => {
            const attributeNames = Object.getOwnPropertyNames(gltfPrimitive.attributes);

            let vertexBufferStride = 0;
            let verticesCount = 0;
            const formats: IVertexAttribute[] = [];

            const attributeByteLengths = attributeNames.map((attributeName) => {
                const attributeAccessor = this._gltf.accessors![gltfPrimitive.attributes[attributeName]];
                const attributeByteLength = this._getBytesPerAttribute(attributeAccessor);
                vertexBufferStride += attributeByteLength;
                verticesCount = Math.max(verticesCount, attributeAccessor.count);
                return attributeByteLength;
            });

            const vertexBuffer = new ArrayBuffer(vertexBufferStride * verticesCount);

            let currentByteOffset = 0;
            let posBuffer = new ArrayBuffer(0);
            let posBufferAlign = 0;
            attributeNames.forEach((attributeName, iAttribute) => {
                const attributeAccessor = this._gltf.accessors![gltfPrimitive.attributes[attributeName]];
                const dataView = new DataView(vertexBuffer, currentByteOffset);
                this._readAccessor(attributeAccessor, dataView, vertexBufferStride);
                currentByteOffset += attributeByteLengths[iAttribute];

                if (attributeName === 'POSITION') {
                    if (attributeAccessor.min) {
                        // @ts-ignore
                        cc.vmath.vec3.min(minPosition, minPosition, new cc.vmath.vec3(
                            attributeAccessor.min[0], attributeAccessor.min[1], attributeAccessor.min[2]));
                    }
                    if (attributeAccessor.max) {
                        // @ts-ignore
                        cc.vmath.vec3.max(maxPosition, maxPosition, new cc.vmath.vec3(
                            attributeAccessor.max[0], attributeAccessor.max[1], attributeAccessor.max[2]));
                    }
                    const comps = this._getComponentsPerAttribute(attributeAccessor.type);
                    const bytes = this._getBytesPerComponent(attributeAccessor.componentType);
                    posBuffer = new ArrayBuffer(comps * bytes * attributeAccessor.count);
                    posBufferAlign = bytes;
                    this._readAccessor(attributeAccessor, new DataView(posBuffer));
                }

                const baseType = this._getAttributeBaseType(attributeAccessor.componentType);
                const type = this._getAttributeType(attributeAccessor.type);

                // // Perform flipY default.
                // if (attributeName.startsWith('TEXCOORD')) {
                //     // FLIP V
                //     if (baseType === AttributeBaseType.FLOAT32 && type === AttributeType.VEC2) {
                //         for (let iVert = 0; iVert < verticesCount; ++iVert) {
                //             const pV = vertexBufferStride * iVert + 4;
                //             const v = dataView.getFloat32(pV, true);
                //             if (v >= 0 && v <= 1) {
                //                 dataView.setFloat32(pV, 1 - v, true);
                //             } else {
                //                 console.error(
                //                     `We currently do flipping texture coordinates(V) compulsively, ` +
                //                     `so that only normalized texture coordinates are supported.`);
                //                 break;
                //             }
                //         }
                //     }
                // }

                formats.push({
                    name: this._getGfxAttributeName(attributeName),
                    baseType,
                    type,
                    normalize: false,
                });
            });

            bufferBlob.setNextAlignment(0);
            vertexBundles.push({
                data: {
                    offset: bufferBlob.getLength(),
                    length: vertexBuffer.byteLength,
                },
                verticesCount,
                attributes: formats,
            });
            bufferBlob.addBuffer(vertexBuffer);

            const primitive: IPrimitive = {
                primitiveMode: this._getPrimitiveMode(gltfPrimitive.mode === undefined ? 4 : gltfPrimitive.mode),
                vertexBundelIndices: [primitiveIndex],
            };

            // geometric info for raycast purposes
            // @ts-ignore
            if (primitive.primitiveMode >= cc.GFXPrimitiveMode.TRIANGLE_LIST) {
                bufferBlob.setNextAlignment(posBufferAlign);
                primitive.geometricInfo = {
                    range: { offset: bufferBlob.getLength(), length: posBuffer.byteLength },
                };
                bufferBlob.addBuffer(posBuffer);
            }

            if (gltfPrimitive.indices !== undefined) {
                const indicesAccessor = this._gltf.accessors![gltfPrimitive.indices];
                const indexStride = this._getBytesPerAttribute(indicesAccessor);
                const indicesData = new ArrayBuffer(indexStride * indicesAccessor.count);
                this._readAccessor(indicesAccessor, new DataView(indicesData));
                bufferBlob.setNextAlignment(indexStride);
                primitive.indices = {
                    indexUnit: this._getIndexUnit(indicesAccessor.componentType),
                    range: {
                        offset: bufferBlob.getLength(),
                        length: indicesData.byteLength,
                    },
                };
                bufferBlob.addBuffer(indicesData);
            }

            return primitive;
        });

        const meshStruct: IMeshStruct = {
            primitives,
            vertexBundles,
            minPosition,
            maxPosition,
        };

        // @ts-ignore
        const mesh = new cc.Mesh();
        mesh.name = this._getGltfXXName(GltfAssetKind.Mesh, iGltfMesh);
        mesh.assign(meshStruct, bufferBlob.getCombined());
        return mesh;
    }

    public createSkeleton(iGltfSkin: number) {
        const gltfSkin = this._gltf.skins![iGltfSkin];
        const inverseBindMatrices = new Array(gltfSkin.joints.length);
        if (gltfSkin.inverseBindMatrices === undefined) {
            // The default is that each matrix is a 4x4 identity matrix,
            // which implies that inverse-bind matrices were pre-applied.
            for (let i = 0; i < inverseBindMatrices.length; ++i) {
                // @ts-ignore
                inverseBindMatrices[i] = new cc.Mat4(
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    0, 0, 0, 1
                );
            }
        } else {
            const inverseBindMatricesAccessor = this._gltf.accessors![gltfSkin.inverseBindMatrices];
            if (inverseBindMatricesAccessor.componentType !== WebGLRenderingContext.FLOAT ||
                inverseBindMatricesAccessor.type !== 'MAT4') {
                throw new Error(`The inverse bind matrix should be floating-point 4x4 matrix.`);
            }
            const data = new Float32Array(inverseBindMatrices.length * 16);
            this._readAccessor(inverseBindMatricesAccessor, createDataViewFromTypedArray(data));
            for (let i = 0; i < inverseBindMatrices.length; ++i) {
                // @ts-ignore
                inverseBindMatrices[i] = new cc.Mat4(
                    data[16 * i + 0], data[16 * i + 1], data[16 * i + 2], data[16 * i + 3],
                    data[16 * i + 4], data[16 * i + 5], data[16 * i + 6], data[16 * i + 7],
                    data[16 * i + 8], data[16 * i + 9], data[16 * i + 10], data[16 * i + 11],
                    data[16 * i + 12], data[16 * i + 13], data[16 * i + 14], data[16 * i + 15]
                );
            }
        }

        // @ts-ignore
        const skeleton = new cc.Skeleton();
        skeleton.name = this._getGltfXXName(GltfAssetKind.Skin, iGltfSkin);
        skeleton._joints = gltfSkin.joints.map((nodeIndex) => this._getNodePath(nodeIndex));
        skeleton._inverseBindMatrices = inverseBindMatrices;

        return skeleton;
    }

    public createAnimation(iGltfAnimation: number) {
        const gltfAnimation = this._gltf.animations![iGltfAnimation];

        // @ts-ignore
        const channels: any[] = [];
        const channelMap = new Map<number, number>();
        const getChannel = (iGltfNode: number) => {
            let iChannel = channelMap.get(iGltfNode);
            if (iChannel === undefined) {
                iChannel = channels.length;
                channelMap.set(iGltfNode, iChannel);
                channels.push({
                    target: this._getNodePath(iGltfNode),
                    propertyAnimations: [],
                });
            }
            return channels[iChannel];
        };

        const keysList: number[][] = [];
        const keysMap = new Map<number, number>();
        let maxLength = 0;
        const getIndexOfKeys = (iKeysAccessor: number) => {
            let result = keysMap.get(iKeysAccessor);
            if (result === undefined) {
                const inputAccessor = this._gltf.accessors![iKeysAccessor];
                if (inputAccessor.componentType !== WebGLRenderingContext.FLOAT ||
                    inputAccessor.type !== 'SCALAR') {
                    throw new Error(`Input of an animation channel must be floating point scalars represent times.`);
                }
                const inputData = new Float32Array(inputAccessor.count);
                this._readAccessor(inputAccessor, createDataViewFromTypedArray(inputData));

                const keys = new Array(inputData.length);
                inputData.forEach((time, index) => {
                    keys[index] = time;
                });
                if (keys.length > 0) {
                    maxLength = Math.max(maxLength, keys[keys.length - 1]);
                }

                result = keysList.length;
                keysMap.set(iKeysAccessor, result);
                keysList.push(keys);
            }
            return result;
        };

        gltfAnimation.channels.forEach((gltfChannel) => {
            const targetNode = gltfChannel.target.node;
            if (targetNode === undefined) {
                // When node isn't defined, channel should be ignored.
                return;
            }

            const channel = getChannel(targetNode);

            const gltfSampler = gltfAnimation.samplers[gltfChannel.sampler];

            const propertyAnimation = {
                indexOfKeys: getIndexOfKeys(gltfSampler.input),
            };
            channel.propertyAnimations.push(propertyAnimation);

            const outputAccessor = this._gltf.accessors![gltfSampler.output];
            if (outputAccessor.componentType !== WebGLRenderingContext.FLOAT) {
                throw new Error(`Output of an animation channel must be floating point values.`);
            }
            const outputData = new Float32Array(
                this._getComponentsPerAttribute(outputAccessor.type) * outputAccessor.count);
            this._readAccessor(outputAccessor, createDataViewFromTypedArray(outputData));
            if (gltfChannel.target.path === 'translation') {
                // @ts-ignore
                propertyAnimation.property = cc.AnimationTargetProperty.position;
                if (outputAccessor.type !== 'VEC3') {
                    throw new Error(`Output of an animation channel targetting translation must be 3d vectors.`);
                }
                // @ts-ignore
                propertyAnimation.values = Array.from(outputData);
            } else if (gltfChannel.target.path === 'rotation') {
                // @ts-ignore
                propertyAnimation.property = cc.AnimationTargetProperty.rotation;
                if (outputAccessor.type !== 'VEC4') {
                    throw new Error(`Output of an animation channel targetting translation must be 4d vectors.`);
                }
                // @ts-ignore
                propertyAnimation.values = Array.from(outputData);
            } else if (gltfChannel.target.path === 'scale') {
                // @ts-ignore
                propertyAnimation.property = cc.AnimationTargetProperty.scale;
                if (outputAccessor.type !== 'VEC3') {
                    throw new Error(`Output of an animation channel targetting scale must be 3d vectors.`);
                }
                // @ts-ignore
                propertyAnimation.values = Array.from(outputData);
            } else {
                console.error(`Unsupported channel target path ${gltfChannel.target.path}.`);
            }
        });

        // @ts-ignore
        const animationClip = new cc.AnimationClip();
        animationClip.name = this._getGltfXXName(GltfAssetKind.Animation, iGltfAnimation);
        animationClip._channels = channels;
        animationClip._keysList = keysList;
        animationClip._length = maxLength;
        return animationClip;
    }

    // @ts-ignore
    public createMaterial(
        iGltfMaterial: number,
        // @ts-ignore
        textures: cc.Texture[],
        // @ts-ignore
        effectGetter: (name: string) => cc.EffectAsset) {
        const gltfMaterial = this._gltf.materials![iGltfMaterial];
        // @ts-ignore
        const material = new cc.Material();
        material.name = this._getGltfXXName(GltfAssetKind.Material, iGltfMaterial);
        material._effectAsset = effectGetter('db://internal/builtin-standard.effect');

        const defines: { [x: string]: boolean; } = {};
        const props: { [x: string]: any; } = {};
        if (gltfMaterial.pbrMetallicRoughness) {
            const pbrMetallicRoughness = gltfMaterial.pbrMetallicRoughness;
            if (pbrMetallicRoughness.baseColorTexture) {
                // tslint:disable-next-line:no-string-literal
                defines['USE_ALBEDO_MAP'] = true;
                // tslint:disable-next-line:no-string-literal
                props['albedoMap'] = textures[pbrMetallicRoughness.baseColorTexture.index];
            } else {
                let color = null;
                if (pbrMetallicRoughness.baseColorFactor) {
                    const c = pbrMetallicRoughness.baseColorFactor;
                    // @ts-ignore
                    color = new cc.Color(c[0] * 255, c[1] * 255, c[2] * 255, c[3] * 255);
                } else {
                    // @ts-ignore
                    color = new cc.Color(255, 255, 255, 255);
                }
                // tslint:disable-next-line:no-string-literal
                props['albedo'] = color;
            }
        }

        if (gltfMaterial.normalTexture) {
            // tslint:disable-next-line:no-string-literal
            defines['USE_NORMAL_MAP'] = true;
            // tslint:disable-next-line:no-string-literal
            props['normalMap'] = textures[gltfMaterial.normalTexture.index];
        }

        if (gltfMaterial.emissiveTexture) {
            // tslint:disable-next-line:no-string-literal
            defines['USE_EMISSIVE_MAP'] = true;
            // tslint:disable-next-line:no-string-literal
            props['emissiveMap'] = textures[gltfMaterial.emissiveTexture.index];
        }

        if (gltfMaterial.emissiveFactor) {
            // @ts-ignore
                // tslint:disable-next-line:no-string-literal
            props['emissive'] = new cc.Color(
                gltfMaterial.emissiveFactor[0] * 255,
                gltfMaterial.emissiveFactor[1] * 255,
                gltfMaterial.emissiveFactor[2] * 255,
                255);
        }

        switch (gltfMaterial.alphaMode) {
            case 'BLEND':
                material._techIdx = 1; // Use transparent technique.
                break;
            case 'MASK':
                const alphaCutoff = gltfMaterial.alphaCutoff === undefined ? 0.5 : gltfMaterial.alphaCutoff;
                // tslint:disable-next-line:no-string-literal
                defines['USE_ALPHA_TEST'] = true;
                // @ts-ignore
                // tslint:disable-next-line:no-string-literal
                props['albedoScale'] = new cc.Vec4(1, 1, 1, alphaCutoff);
                break;
            case 'OPAQUE':
            case undefined:
                break;
            default:
                console.warn(
                    `Alpha mode ${gltfMaterial.alphaMode} ` +
                    `(for material named ${gltfMaterial.name}, gltf-index ${iGltfMaterial}) ` +
                    `is not supported currently.`);
                break;
        }

        if (Object.keys(defines).length !== 0) {
            material._defines = [defines];
        }
        if (Object.keys(props).length !== 0) {
            material._props = [props];
        }

        return material;
    }

    public getTextureParameters(gltfTexture: Texture, userData: TextureBaseAssetUserData) {
        const convertWrapMode = (gltfWrapMode: number): WrapMode =>  {
            switch (gltfWrapMode) {
                case 33071: return 'clamp-to-edge';
                case 33648: return 'mirrored-repeat';
                case 10497: return 'repeat';
                default:
                    console.error(`Unsupported wrapMode: ${gltfWrapMode}, 'repeat' is used.`);
                    return 'repeat';
            }
        };

        const convertMagFilter = (gltfFilter: number): Filter => {
            switch (gltfFilter) {
                case 9728: return 'nearest';
                case 9729: return 'linear';
                default:
                    console.warn(`Unsupported filter: ${gltfFilter}, 'linear' is used.`);
                    return 'linear';
            }
        };

        const convertMinFilter = (gltfFilter: number): Filter => {
            switch (gltfFilter) {
                case 9728: return 'nearest';
                case 9729: return 'linear';
                case 9984: // NEAREST_MIPMAP_NEAREST
                case 9985: // LINEAR_MIPMAP_NEAREST
                case 9986: // NEAREST_MIPMAP_LINEAR
                case 9987: // LINEAR_MIPMAP_LINEAR
                default:
                    console.warn(`Unsupported filter: ${gltfFilter}, 'linear' is used.`);
                    return 'linear';
            }
        };

        if (gltfTexture.sampler === undefined) {
            userData.wrapModeS = 'repeat';
            userData.wrapModeT = 'repeat';
        } else {
            const gltfSampler = this._gltf.samplers![gltfTexture.sampler];
            userData.minfilter = gltfSampler.minFilter === undefined ?
                'linear' : convertMinFilter(gltfSampler.minFilter);
            userData.magfilter = gltfSampler.magFilter === undefined ?
                'linear' : convertMagFilter(gltfSampler.magFilter);
            userData.wrapModeS = convertWrapMode(gltfSampler.wrapS === undefined ? 10497 : gltfSampler.wrapS);
            userData.wrapModeT = convertWrapMode(gltfSampler.wrapT === undefined ? 10497 : gltfSampler.wrapT);
        }
    }

    public getImageUriInfo(uri: string, resolve: boolean = true): GltfImageUriInfo {
        if (uri.startsWith('data:')) {
            return {
                isDataUri: true,
            };
        } else {
            return {
                isDataUri: false,
                fullPath: resolve ? path.resolve(path.dirname(this.path), uri) : uri,
            } as GltfImagePathInfo;
        }
    }

    // @ts-ignore
    public createScene(iGltfScene: number, gltfAssetsTable: IGltfAssetTable): cc.Node {
        const sceneNode = this._getSceneNode(iGltfScene, gltfAssetsTable);
        if (this._gltf.animations !== undefined) {
            const animationComponent = sceneNode.addComponent('cc.AnimationComponent');
            this._gltf.animations.forEach((gltfAnimation, index) => {
                const animationUUID = gltfAssetsTable.animations![index];
                if (animationUUID) {
                    const animationName = this._getGltfXXName(GltfAssetKind.Animation, index);
                    animationComponent.addClip(animationName, this._assetLoader(animationUUID));
                }
            });
        }
        return sceneNode;
    }

    public readImage(gltfImage: Image) {
        const imageUri = gltfImage.uri;
        if (imageUri !== undefined) {
            const imageUriInfo = this.getImageUriInfo(imageUri);
            if (isFilesystemPath(imageUriInfo)) {
                return this._readImageByFsPath(imageUriInfo.fullPath);
            } else {
                return this._readImageByDataUri(imageUri);
            }
        } else if (gltfImage.bufferView !== undefined) {
            const bufferView = this._gltf.bufferViews![gltfImage.bufferView];
            return this._readImageInBufferview(bufferView, gltfImage.mimeType);
        }
    }

    private _readImageByFsPath(imagePath: string) {
        try {
            return {
                imageData: fs.readFileSync(imagePath),
                extName: path.extname(imagePath),
            };
        } catch (error) {
            console.error(`Failed to load texture with path: ${imagePath}`);
            return undefined;
        }
    }

    private _readImageByDataUri(dataUri: string) {
        const result = imageDataUri.decode(dataUri);
        if (!result) {
            return undefined;
        }
        const x = result.imageType.split('/');
        if (x.length === 0) {
            console.error(`Bad data uri.${dataUri}`);
            return undefined;
        }
        return {
            extName: `.${x[x.length - 1]}`,
            imageData: result.dataBuffer,
        };
    }

    private _readImageInBufferview(bufferView: BufferView, mimeType: string | undefined) {
        let extName = '';
        switch (mimeType) {
            case 'image/jpeg':
                extName = '.jpg';
                break;
            case 'image/png':
                extName = '.png';
                break;
            default:
                throw new Error(`Bad MIME Type ${mimeType}`);
        }

        const buffer = this._buffers[bufferView.buffer];
        const imageData = Buffer.from(
            buffer.buffer, buffer.byteOffset + (bufferView.byteOffset || 0), bufferView.byteLength);
        return {
            extName,
            imageData,
        };
    }

    private _getSceneNode(iGltfScene: number, gltfAssetsTable: IGltfAssetTable) {
        const gltfScene = this._gltf.scenes![iGltfScene];
        const nodes = new Array(this._gltf.nodes!.length);
        // @ts-ignore
        const getNode = (index: number, root: cc.Node) => {
            if (nodes[index] !== undefined) {
                return nodes[index];
            }
            const gltfNode = this._gltf.nodes![index];
            const node = this._createNode(index, gltfAssetsTable, root);
            nodes[index] = node;
            if (gltfNode.children !== undefined) {
                gltfNode.children.forEach((childIndex) => {
                    const childNode = getNode(childIndex, root || node);
                    childNode.parent = node;
                });
            }
            return node;
        };

        // @ts-ignore
        const rootNodes: cc.Node[] = [];
        if (gltfScene.nodes !== undefined) {
            gltfScene.nodes.forEach((rootIndex) => {
                const rootNode = getNode(rootIndex, null);
                rootNodes.push(rootNode);
            });
        }

        if (rootNodes.length === 1) {
            return rootNodes[0];
        }

        const sceneName = this._getGltfXXName(GltfAssetKind.Scene, iGltfScene);
        // @ts-ignore
        const result = new cc.Node(sceneName);
        rootNodes.forEach((node) => node.parent = result);
        return result;
    }

    // @ts-ignore
    private _createNode(iGltfNode: number, gltfAssetsTable: IGltfAssetTable, root: cc.Node) {
        const gltfNode = this._gltf.nodes![iGltfNode];
        const node = this._createEmptyNode(iGltfNode);
        if (gltfNode.mesh !== undefined) {
            let modelComponent = null;
            if (gltfNode.skin === undefined) {
                modelComponent = node.addComponent('cc.ModelComponent');
            } else {
                modelComponent = node.addComponent('cc.SkinningModelComponent');
                const skeleton = gltfAssetsTable.skeletons![gltfNode.skin];
                if (skeleton) {
                    modelComponent._skeleton = this._assetLoader(skeleton);
                }
                modelComponent._skinningRoot = root;
            }
            const mesh = gltfAssetsTable.meshes![gltfNode.mesh];
            if (mesh) {
                modelComponent._mesh = this._assetLoader(mesh);
            }
            const gltfMesh = this.gltf.meshes![gltfNode.mesh];
            const materials = gltfMesh.primitives.map((gltfPrimitive) => {
                if (gltfPrimitive.material === undefined) {
                    return null;
                } else {
                    const material = gltfAssetsTable.materials![gltfPrimitive.material];
                    if (material) {
                        return this._assetLoader(material);
                    }
                }
            });
            modelComponent._materials = materials;
        }
        return node;
    }

    private _createEmptyNode(iGltfNode: number) {
        const gltfNode = this._gltf.nodes![iGltfNode];
        const nodeName = this._getGltfXXName(GltfAssetKind.Node, iGltfNode);
        // @ts-ignore
        const node = new cc.Node(nodeName);
        if (gltfNode.translation) {
            node.setPosition(
                gltfNode.translation[0],
                gltfNode.translation[1],
                gltfNode.translation[2]
            );
        }
        if (gltfNode.rotation) {
            node.setRotation(
                gltfNode.rotation[0],
                gltfNode.rotation[1],
                gltfNode.rotation[2],
                gltfNode.rotation[3]
            );
        }
        if (gltfNode.scale) {
            node.setScale(
                gltfNode.scale[0],
                gltfNode.scale[1],
                gltfNode.scale[2]
            );
        }
        return node;
    }

    private _getNodePath(node: number) {
        if (this._nodePathTable == null) {
            this._nodePathTable = this._createNodePathTable();
        }
        return this._nodePathTable[node];
    }

    private _createNodePathTable() {
        if (this._gltf.nodes === undefined) {
            return [];
        }

        const nodeNames = new Array<string>(this._gltf.nodes.length).fill('');
        for (let iNode = 0; iNode < nodeNames.length; ++iNode) {
            nodeNames[iNode] = this._getGltfXXName(GltfAssetKind.Node, iNode);
        }

        const parentTable = new Array<number>(this._gltf.nodes.length).fill(-1);
        this._gltf.nodes.forEach((gltfNode, nodeIndex) => {
            if (gltfNode.children) {
                gltfNode.children.forEach((iChildNode) => {
                    parentTable[iChildNode] = nodeIndex;
                });
            }
        });

        const result = new Array<string>(this._gltf.nodes.length).fill('');
        this._gltf.nodes.forEach((gltfNode, nodeIndex) => {
            const segments: string[] = [];
            for (let i = nodeIndex; i >= 0; i = parentTable[i]) {
                segments.unshift(nodeNames[i]);
            }
            result[nodeIndex] = segments.join('/');
        });

        // Remove root segment
        result.forEach((path, index) => {
            const segments = path.split('/');
            segments.shift();
            result[index] = segments.join('/');
        });

        return result;
    }

    private _readAccessor(gltfAccessor: Accessor, outputBuffer: DataView, outputStride = 0) {
        if (gltfAccessor.bufferView === undefined) {
            console.warn(`Note, there is an accessor assiociating with no buffer view in file ${this.path}.`);
            return;
        }

        const gltfBufferView = this._gltf.bufferViews![gltfAccessor.bufferView];

        const componentsPerAttribute = this._getComponentsPerAttribute(gltfAccessor.type);
        const bytesPerElement = this._getBytesPerComponent(gltfAccessor.componentType);

        if (outputStride === 0) {
            outputStride = componentsPerAttribute * bytesPerElement;
        }

        const inputStartOffset =
            (gltfAccessor.byteOffset !== undefined ? gltfAccessor.byteOffset : 0) +
            (gltfBufferView.byteOffset !== undefined ? gltfBufferView.byteOffset : 0);

        const inputBuffer = createDataViewFromBuffer(this._buffers[gltfBufferView.buffer], inputStartOffset);

        const inputStride = gltfBufferView.byteStride !== undefined ?
            gltfBufferView.byteStride : componentsPerAttribute * bytesPerElement;

        const componentReader = this._getComponentReader(gltfAccessor.componentType);
        const componentWriter = this._getComponentWriter(gltfAccessor.componentType);

        for (let iAttribute = 0; iAttribute < gltfAccessor.count; ++iAttribute) {
            const i = createDataViewFromTypedArray(inputBuffer, inputStride * iAttribute);
            const o = createDataViewFromTypedArray(outputBuffer, outputStride * iAttribute);
            for (let iComponent = 0; iComponent < componentsPerAttribute; ++iComponent) {
                const componentBytesOffset = bytesPerElement * iComponent;
                const value = componentReader(i, componentBytesOffset);
                componentWriter(o, componentBytesOffset, value);
            }
        }
    }

    private _getPrimitiveMode(mode: number) {
        // @ts-ignore
        const GFXPrimitiveMode = cc.GFXPrimitiveMode;
        switch (mode) {
            case 0: return GFXPrimitiveMode.POINT_LIST;
            case 1: return GFXPrimitiveMode.LINE_LIST;
            case 2: return GFXPrimitiveMode.LINE_LOOP;
            case 3: return GFXPrimitiveMode.LINE_STRIP;
            case 4: return GFXPrimitiveMode.TRIANGLE_LIST;
            case 5: return GFXPrimitiveMode.TRIANGLE_STRIP;
            case 6: return GFXPrimitiveMode.TRIANGLE_FAN;
            default:
                throw new Error(`Unrecognized primitive mode: ${mode}.`);
        }
    }

    private _getAttributeType(type: string) {
        switch (type) {
            case 'SCALAR': return AttributeType.SCALAR;
            case 'VEC2': return AttributeType.VEC2;
            case 'VEC3': return AttributeType.VEC3;
            case 'VEC4': return AttributeType.VEC4;
            default:
                throw new Error(`Unrecognized attribute type: ${type}.`);
        }
    }

    private _getAttributeBaseType(componentType: number) {
        switch (componentType) {
            case WebGLRenderingContext.BYTE: return AttributeBaseType.INT8;
            case WebGLRenderingContext.UNSIGNED_BYTE: return AttributeBaseType.UINT8;
            case WebGLRenderingContext.SHORT: return AttributeBaseType.INT16;
            case WebGLRenderingContext.UNSIGNED_SHORT: return AttributeBaseType.UINT16;
            case WebGLRenderingContext.UNSIGNED_INT: return AttributeBaseType.UINT32;
            case WebGLRenderingContext.FLOAT: return AttributeBaseType.FLOAT32;
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

    private _getIndexUnit(componentType: number) {
        switch (componentType) {
            case WebGLRenderingContext.UNSIGNED_BYTE: return IndexUnit.UINT8;
            case WebGLRenderingContext.UNSIGNED_SHORT: return IndexUnit.UINT16;
            case WebGLRenderingContext.UNSIGNED_INT: return IndexUnit.UINT32;
            default:
                throw new Error(`Unrecognized index type: ${componentType}`);
        }
    }

    private _getBytesPerAttribute(gltfAccessor: Accessor) {
        return this._getBytesPerComponent(gltfAccessor.componentType) *
            this._getComponentsPerAttribute(gltfAccessor.type);
    }

    private _getComponentsPerAttribute(type: string) {
        switch (type) {
            case 'SCALAR': return 1;
            case 'VEC2': return 2;
            case 'VEC3': return 3;
            case 'VEC4': case 'MAT2': return 4;
            case 'MAT3': return 9;
            case 'MAT4': return 16;
            default:
                throw new Error(`Unrecognized attribute type: ${type}.`);
        }
    }

    private _getBytesPerComponent(componentType: number) {
        switch (componentType) {
            case WebGLRenderingContext.BYTE: case WebGLRenderingContext.UNSIGNED_BYTE: return 1;
            case WebGLRenderingContext.SHORT: case WebGLRenderingContext.UNSIGNED_SHORT: return 2;
            case WebGLRenderingContext.UNSIGNED_INT: case WebGLRenderingContext.FLOAT: return 4;
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

    private _getGfxAttributeName(name: string) {
        // @ts-ignore
        const GFXAttributeName = cc.GFXAttributeName;
        switch (name) {
            case 'POSITION': return GFXAttributeName.ATTR_POSITION;
            case 'NORMAL': return GFXAttributeName.ATTR_NORMAL;
            case 'TANGENT': return GFXAttributeName.ATTR_TANGENT;
            case 'COLOR_0': return GFXAttributeName.ATTR_COLOR;
            case 'TEXCOORD_0': return GFXAttributeName.ATTR_TEX_COORD;
            case 'TEXCOORD_1': return GFXAttributeName.ATTR_TEX_COORD1;
            case 'TEXCOORD_2': return GFXAttributeName.ATTR_TEX_COORD2;
            case 'TEXCOORD_3': return GFXAttributeName.ATTR_TEX_COORD3;
            case 'JOINTS_0': return GFXAttributeName.ATTR_JOINTS;
            case 'WEIGHTS_0': return GFXAttributeName.ATTR_WEIGHTS;
            default:
                throw new Error(`Unrecognized attribute type: ${name}`);
        }
    }

    private _getComponentReader(componentType: number): (buffer: DataView, offset: number) => number {
        switch (componentType) {
            case WebGLRenderingContext.BYTE: return (buffer, offset) => buffer.getInt8(offset);
            case WebGLRenderingContext.UNSIGNED_BYTE: return (buffer, offset) => buffer.getUint8(offset);
            case WebGLRenderingContext.SHORT: return (buffer, offset) => buffer.getInt16(offset, true);
            case WebGLRenderingContext.UNSIGNED_SHORT: return (buffer, offset) => buffer.getUint16(offset, true);
            case WebGLRenderingContext.UNSIGNED_INT: return (buffer, offset) => buffer.getUint32(offset, true);
            case WebGLRenderingContext.FLOAT: return (buffer, offset) => buffer.getFloat32(offset, true);
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

    // tslint:disable: max-line-length
    private _getComponentWriter(componentType: number): (buffer: DataView, offset: number, value: number) => void {
        switch (componentType) {
            case WebGLRenderingContext.BYTE: return (buffer, offset, value) => buffer.setInt8(offset, value);
            case WebGLRenderingContext.UNSIGNED_BYTE: return (buffer, offset, value) => buffer.setUint8(offset, value);
            case WebGLRenderingContext.SHORT: return (buffer, offset, value) => buffer.setInt16(offset, value, true);
            case WebGLRenderingContext.UNSIGNED_SHORT: return (buffer, offset, value) => buffer.setUint16(offset, value, true);
            case WebGLRenderingContext.UNSIGNED_INT: return (buffer, offset, value) => buffer.setUint32(offset, value, true);
            case WebGLRenderingContext.FLOAT: return (buffer, offset, value) => buffer.setFloat32(offset, value, true);
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }
    // tslint:enable: max-line-length

    private _getGltfXXName(assetKind: GltfAssetKind, index: number) {
        const assetsArrayName = {
            [GltfAssetKind.Animation]: 'animations',
            [GltfAssetKind.Image]: 'images',
            [GltfAssetKind.Material]: 'materials',
            [GltfAssetKind.Node]: 'nodes',
            [GltfAssetKind.Skin]: 'skins',
            [GltfAssetKind.Texture]: 'textures',
            [GltfAssetKind.Scene]: 'scenes',
        };
        // @ts-ignore
        const assets = this._gltf[assetsArrayName[assetKind]];
        if (!assets) {
            return '';
        }
        const asset = assets[index];
        if ((typeof asset.name) === 'string') {
            return asset.name;
        } else {
            return `${GltfAssetKind[assetKind]}-${index}`;
        }
    }
}

export async function readGltf(gltfFilePath: string) {
    return path.extname(gltfFilePath) === '.glb' ?
        await readGlb(gltfFilePath) :
        await readGltfJson(gltfFilePath);
}

async function readGltfJson(path: string) {
    const gltf = await fs.readJSONSync(path) as GlTf;
    let binaryBuffers: Buffer[] = [];
    if (gltf.buffers) {
        binaryBuffers = gltf.buffers.map((gltfBuffer) => {
            if (!gltfBuffer.uri) {
                return Buffer.alloc(0);
            }
            return readBufferData(path, gltfBuffer.uri);
        });
    }
    return { gltf, binaryBuffers };
}

async function readGlb(path: string) {
    const badGLBFormat = (): never => {
        throw new Error(`Bad glb format.`);
    };

    const glb = await fs.readFile(path);
    if (glb.length < 12) {
        return badGLBFormat();
    }

    const magic = glb.readUInt32LE(0);
    if (magic !== 0x46546C67) {
        return badGLBFormat();
    }

    const ChunkTypeJson = 0x4E4F534A;
    const ChunkTypeBin = 0x004E4942;
    const version = glb.readUInt32LE(4);
    const length = glb.readUInt32LE(8);
    let gltf: GlTf | undefined;
    let embededBinaryBuffer: Buffer | undefined;
    for (let iChunk = 0, offset = 12; (offset + 8) <= glb.length; ++iChunk) {
        const chunkLength = glb.readUInt32LE(offset);
        offset += 4;
        const chunkType = glb.readUInt32LE(offset);
        offset += 4;
        if (offset + chunkLength > glb.length) {
            return badGLBFormat();
        }
        const payload = Buffer.from(glb.buffer, offset, chunkLength);
        offset += chunkLength;
        if (iChunk === 0) {
            if (chunkType !== ChunkTypeJson) {
                return badGLBFormat();
            }
            const gltfJson = new TextDecoder('utf-8').decode(payload);
            gltf = JSON.parse(gltfJson) as GlTf;
        } else if (chunkType === ChunkTypeBin) {
            // TODO: Should we copy?
            // embededBinaryBuffer = payload.slice();
            embededBinaryBuffer = payload;
        }
    }

    if (!gltf) {
        return badGLBFormat();
    } else {
        let binaryBuffers: Buffer[] = [];
        if (gltf.buffers) {
            binaryBuffers = gltf.buffers.map((gltfBuffer, index) => {
                if (!gltfBuffer.uri) {
                    if (index === 0 && embededBinaryBuffer) {
                        return embededBinaryBuffer;
                    }
                    return Buffer.alloc(0);
                }
                return readBufferData(path, gltfBuffer.uri);
            });
        }
        return { gltf, binaryBuffers };
    }
}

export function isDataUri(uri: string) {
    return uri.startsWith('data:');
}

class BufferBlob {
    private _arrayBufferOrPaddings: Array<ArrayBuffer | number> = [];
    private _length = 0;

    public setNextAlignment(align: number) {
        if (align !== 0) {
            const remainder = this._length % align;
            if (remainder !== 0) {
                const padding = align - remainder;
                this._arrayBufferOrPaddings.push(padding);
                this._length += padding;
            }
        }
    }

    public addBuffer(arrayBuffer: ArrayBuffer) {
        const result = this._length;
        this._arrayBufferOrPaddings.push(arrayBuffer);
        this._length += arrayBuffer.byteLength;
        return result;
    }

    public getLength() {
        return this._length;
    }

    public getCombined() {
        const result = new Uint8Array(this._length);
        let counter = 0;
        this._arrayBufferOrPaddings.forEach((arrayBufferOrPadding) => {
            if (typeof arrayBufferOrPadding === 'number') {
                counter += arrayBufferOrPadding;
            } else {
                result.set(new Uint8Array(arrayBufferOrPadding), counter);
                counter += arrayBufferOrPadding.byteLength;
            }
        });
        return result.buffer;
    }
}

function readBufferData(gltfFilePath: string, uri: string): Buffer {
    if (!uri.startsWith('data:')) {
        const bufferPath = path.resolve(path.dirname(gltfFilePath), uri);
        return fs.readFileSync(bufferPath);
    } else {
        const dataUrl = parseDataUrl(uri);
        if (!dataUrl) {
            throw new Error(`Bad data uri.${uri}`);
        }
        return Buffer.from(dataUrl.toBuffer().buffer);
    }
}

function createDataViewFromBuffer(buffer: Buffer, offset: number = 0) {
    return new DataView(buffer.buffer, buffer.byteOffset + offset);
}

function createDataViewFromTypedArray(typedArray: ArrayBufferView, offset: number = 0) {
    return new DataView(typedArray.buffer, typedArray.byteOffset + offset);
}
