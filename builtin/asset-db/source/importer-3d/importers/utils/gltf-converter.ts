import parseDataUrl from 'parse-data-url';
import * as path from 'path';
import { Accessor, Animation, GlTf,
    Material, Mesh, Node, Scene, Skin, AnimationChannel } from '../../../../../../@types/asset-db/glTF';
import { AttributeBaseType, AttributeType, IMeshStruct,
    IndexUnit, IPrimitive, IVertexAttribute, IVertexBundle } from '../mesh';

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

    public createMesh(gltfMesh: Mesh) {
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
                    this._readAccessor(attributeAccessor, new DataView(posBuffer));
                }

                const baseType = this._getAttributeBaseType(attributeAccessor.componentType);
                const type = this._getAttributeType(attributeAccessor.type);

                // Perform flipY default.
                if (attributeName.startsWith('TEXCOORD')) {
                    // FLIP V
                    if (baseType === AttributeBaseType.FLOAT32 && type === AttributeType.VEC2) {
                        for (let iVert = 0; iVert < verticesCount; ++iVert) {
                            const pV = vertexBufferStride * iVert + 4;
                            const v = dataView.getFloat32(pV, true);
                            if (v >= 0 && v <= 1) {
                                dataView.setFloat32(pV, 1 - v, true);
                            } else {
                                console.error(
                                    `We currently do flipping texture coordinates(V) compulsively, ` +
                                    `so that only normalized texture coordinates are supported.`);
                                break;
                            }
                        }
                    }
                }

                formats.push({
                    name: this._getGfxAttributeName(attributeName),
                    baseType,
                    type,
                    normalize: false,
                });
            });

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
        mesh.name = gltfMesh.name;
        mesh.assign(meshStruct, bufferBlob.getCombined());
        return mesh;
    }

    public createSkeleton(gltfSkin: Skin) {
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
            this._readAccessor(inverseBindMatricesAccessor, new DataView(data.buffer));
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
        skeleton.name = gltfSkin.name;
        skeleton._joints = gltfSkin.joints.map((nodeIndex) => this._getNodePath(nodeIndex));
        skeleton._inverseBindMatrices = inverseBindMatrices;

        return skeleton;
    }

    public createAnimation(gltfAnimation: Animation) {
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
                this._readAccessor(inputAccessor, new DataView(inputData.buffer));

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
            this._readAccessor(outputAccessor, new DataView(outputData.buffer));
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
        animationClip.name = gltfAnimation.name;
        animationClip._channels = channels;
        animationClip._keysList = keysList;
        animationClip._length = maxLength;
        return animationClip;
    }

    // @ts-ignore
    public createMaterial(
        gltfMaterial: Material,
        // @ts-ignore
        textures: cc.Texture[],
        // @ts-ignore
        effectGetter: (name: string) => cc.EffectAsset) {
        // @ts-ignore
        const material = new cc.Material();
        material.name = gltfMaterial.name;
        material._effectAsset = effectGetter('db://internal/builtin-phong.effect');
        if (gltfMaterial.pbrMetallicRoughness) {
            const pbrMetallicRoughness = gltfMaterial.pbrMetallicRoughness;
            if (pbrMetallicRoughness.baseColorTexture) {
                material._defines = [{ USE_DIFFUSE_TEXTURE: true }];
                material._props = [{diffuse_texture: textures[pbrMetallicRoughness.baseColorTexture.index]}];
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
                material._props = [{diffuseColor: color}];
            }
        }

        return material;
    }

    public createTexture(index: number) {
        if (this._gltf.textures === undefined || index >= this._gltf.textures.length) {
            return null;
        }

        const gltfTexture = this._gltf.textures[index];
        // @ts-ignore
        const texture = new cc.Texture();
        texture.name = gltfTexture.name;
        if (gltfTexture.sampler === undefined) {
            // @ts-ignore
            texture.setWrapMode(cc.TextureBase.WrapMode.REPEAT, cc.TextureBase.WrapMode.REPEAT);
        } else {
            const gltfSampler = this._gltf.samplers![gltfTexture.sampler];
            texture.setFilters(
                gltfSampler.minFilter === undefined ? undefined : this._getFilter(gltfSampler.minFilter),
                gltfSampler.magFilter === undefined ? undefined : this._getFilter(gltfSampler.magFilter)
            );
            texture.setWrapMode(
                this._getWrapMode(gltfSampler.wrapS === undefined ? 10497 : gltfSampler.wrapS),
                this._getWrapMode(gltfSampler.wrapT === undefined ? 10497 : gltfSampler.wrapT)
            );
        }

        return texture;
    }

    public getImageUriInfo(uri: string, resolve: boolean = true): GltfImageUriInfo {
        if (uri.startsWith('data:')) {
            const dataUri = parseDataUrl(uri);
            if (dataUri && dataUri.mediaType === 'image/ccmissing') {
                const originalPath = dataUri.toBuffer().toString();
                return {
                    isDataUri: false,
                    fullPath: originalPath,
                } as GltfImagePathInfo;
            }
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
    public createScene(gltfScene: Scene, gltfAssetsTable: IGltfAssetTable): cc.Node {
        const sceneNode = this._getSceneNode(gltfScene, gltfAssetsTable);
        if (this._gltf.animations !== undefined) {
            const animationComponent = sceneNode.addComponent('cc.AnimationComponent');
            this._gltf.animations.forEach((gltfAnimation, index) => {
                const animationUUID = gltfAssetsTable.animations![index];
                if (animationUUID) {
                    animationComponent.addClip(gltfAnimation.name, this._assetLoader(animationUUID));
                }
            });
        }
        return sceneNode;
    }

    private _getSceneNode(gltfScene: Scene, gltfAssetsTable: IGltfAssetTable) {
        const nodes = new Array(this._gltf.nodes!.length);
        // @ts-ignore
        const getNode = (index: number, root: cc.Node) => {
            if (nodes[index] !== undefined) {
                return nodes[index];
            }
            const gltfNode = this._gltf.nodes![index];
            const node = this._createNode(gltfNode, gltfAssetsTable, root);
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

        // @ts-ignore
        const result = new cc.Node();
        result.name = gltfScene.name;
        rootNodes.forEach((node) => node.parent = result);
        return result;
    }

    // @ts-ignore
    private _createNode(gltfNode: Node, gltfAssetsTable: IGltfAssetTable, root: cc.Node) {
        const node = this._createEmptyNode(gltfNode);
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

    private _createEmptyNode(gltfNode: Node) {
        // @ts-ignore
        const node = new cc.Node(gltfNode.name);
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

        const result = new Array<string>(this._gltf.nodes.length);
        result.fill('');
        this._gltf.nodes.forEach((gltfNode, nodeIndex) => {
            const myPath = result[nodeIndex] + gltfNode.name;
            result[nodeIndex] = myPath;
            if (gltfNode.children) {
                gltfNode.children.forEach((childNodeIndex) => {
                    const childPath = result[childNodeIndex];
                    result[childNodeIndex] = `${myPath}/${childPath}`;
                });
            }
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
            console.warn(`Note, there is an accessor assiociate with no buffer view.`);
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

        const inputBuffer = new DataView(this._buffers[gltfBufferView.buffer].buffer, inputStartOffset);

        const inputStride = gltfBufferView.byteStride !== undefined ?
            gltfBufferView.byteStride : componentsPerAttribute * bytesPerElement;

        const componentReader = this._getComponentReader(gltfAccessor.componentType);
        const componentWriter = this._getComponentWriter(gltfAccessor.componentType);

        for (let iAttribute = 0; iAttribute < gltfAccessor.count; ++iAttribute) {
            const i = new DataView(inputBuffer.buffer, inputBuffer.byteOffset + inputStride * iAttribute);
            const o = new DataView(outputBuffer.buffer, outputBuffer.byteOffset + outputStride * iAttribute);
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

    private _getFilter(filter: number) {
        switch (filter) {
            case 9728:
                // @ts-ignore
                return cc.TextureBase.Filter.NEAREST;
            case 9729:
                // @ts-ignore
                return cc.TextureBase.Filter.LINEAR;
            default:
                throw new Error(`Unrecognized filter: ${filter}.`);
        }
    }

    private _getWrapMode(wrapMode: number) {
        switch (wrapMode) {
            case 33071:
                // @ts-ignore
                return cc.TextureBase.WrapMode.CLAMP_TO_EDGE;
            case 33648:
                // @ts-ignore
                return cc.TextureBase.WrapMode.MIRRORED_REPEAT;
            case 10497:
                // @ts-ignore
                return cc.TextureBase.WrapMode.REPEAT;
            default:
                throw new Error(`Unrecognized wrapMode: ${wrapMode}.`);
        }
    }
}

class BufferBlob {
    private _arrayBuffers: ArrayBuffer[] = [];
    private _length = 0;

    public addBuffer(arrayBuffer: ArrayBuffer) {
        const result = this._length;
        this._arrayBuffers.push(arrayBuffer);
        this._length += arrayBuffer.byteLength;
        return result;
    }

    public getLength() {
        return this._length;
    }

    public getCombined() {
        let length = 0;
        this._arrayBuffers.forEach((arrayBuffer) => length += arrayBuffer.byteLength);
        const result = new Uint8Array(length);
        let counter = 0;
        this._arrayBuffers.forEach((arrayBuffer) => {
            result.set(new Uint8Array(arrayBuffer), counter);
            counter += arrayBuffer.byteLength;
        });
        return result.buffer;
    }
}
