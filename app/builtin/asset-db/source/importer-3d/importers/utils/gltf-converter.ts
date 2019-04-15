import { AssertionError } from 'assert';
import * as fs from 'fs-extra';
import * as imageDataUri from 'image-data-uri';
import parseDataUrl from 'parse-data-url';
import * as path from 'path';
import { Accessor, Animation, AnimationChannel,
    BufferView, GlTf, Image, Material, Mesh, MeshPrimitive, Node, Scene, Skin, Texture } from '../../../../../../@types/asset-db/glTF';
import { Filter, TextureBaseAssetUserData, WrapMode, defaultMinFilter, defaultMagFilter } from '../texture-base';

// tslint:disable:no-string-literal

export interface GltfImageUriInfo {
    isDataUri: boolean;
}

export interface GltfImagePathInfo extends GltfImageUriInfo {
    fullPath: string;
}

export function isFilesystemPath(uriInfo: GltfImageUriInfo): uriInfo is GltfImagePathInfo {
    return !uriInfo.isDataUri;
}

export type GltfAssetFinderKind = 'meshes' | 'animations' | 'skeletons' | 'textures' | 'materials';

export interface IGltfAssetFinder {
    find<T extends cc.Asset>(kind: GltfAssetFinderKind, index: number): T | null;
}

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

export enum NormalImportSetting {
    /**
     * 如果模型文件中包含法线信息则导出法线，否则不导出法线。
     */
    optional,

    /**
     * 不在导出的网格中包含法线信息。
     */
    exclude,

    /**
     * 如果模型文件中包含法线信息则导出法线，否则重新计算并导出法线。
     */
    require,

    /**
     * 不管模型文件中是否包含法线信息，直接重新计算并导出法线。
     */
    recalculate,
}

export enum TangentImportSetting {
    /**
     * 不在导出的网格中包含正切信息。
     */
    exclude,

    /**
     * 如果模型文件中包含正切信息则导出正切，否则不导出正切。
     */
    optional,

    /**
     * 如果模型文件中包含正切信息则导出正切，否则重新计算并导出正切。
     */
    require,

    /**
     * 不管模型文件中是否包含正切信息，直接重新计算并导出正切。
     */
    recalculate,
}

const enum GltfPrimitiveMode {
    POINTS = 0,
    LINES = 1,
    LINE_LOOP = 2,
    LINE_STRIP = 3,
    TRIANGLES = 4,
    TRIANGLE_STRIP = 5,
    TRIANGLE_FAN = 6,
    __DEFAULT = 4,
}

const enum GltfAccessorType {
    SCALAR = 'SCALAR',
    VEC2 = 'VEC2',
    VEC3 = 'VEC3',
    VEC4 = 'VEC4',
    MAT2 = 'MAT2',
    MAT3 = 'MAT3',
    MAT4 = 'MAT4',
}

const enum GltfAccessorComponentType {
    BYTE = 5120,
    UNSIGNED_BYTE = 5121,
    SHORT = 5122,
    UNSIGNED_SHORT = 5123,
    UNSIGNED_INT = 5125,
    FLOAT = 5126,
}

const enum GltfTextureMagFilter {
    NEAREST = 9728,
    LINEAR = 9729,
}

const enum GltfTextureMinFilter {
    NEAREST = 9728,
    LINEAR = 9729,
    NEAREST_MIPMAP_NEAREST = 9984,
    LINEAR_MIPMAP_NEAREST = 9985,
    NEAREST_MIPMAP_LINEAR = 9986,
    LINEAR_MIPMAP_LINEAR = 9987,
}

const enum GltfWrapMode {
    CLAMP_TO_EDGE = 33071,
    MIRRORED_REPEAT = 33648,
    REPEAT = 10497,
    __DEFAULT = 10497,
}

const enum GltfAnimationChannelTargetPath {
    translation = 'translation',
    rotation = 'rotation',
    scale = 'scale',
    weights = 'weights',
}

const enum GltfSemanticName {
    // float
    // vec3
    POSITION = 'POSITION',

    // float
    // vec3
    NORMAL = 'NORMAL',

    // float
    // vec4
    TANGENT = 'TANGENT',

    // float/unsigned byte normalized/unsigned short normalized
    // vec2
    TEXCOORD_0 = 'TEXCOORD_0',

    // float/unsigned byte normalized/unsigned short normalized
    // vec2
    TEXCOORD_1 = 'TEXCOORD_1',

    // float/unsigned byte normalized/unsigned short normalized
    // vec3/vec4
    COLOR_0 = 'COLOR_0',

    // unsgiend byte/unsigned short
    // vec4
    JOINTS_0 = 'JOINTS_0',

    // float/unsigned byte normalized/unsigned short normalized
    // vec4
    WEIGHTS_0 = 'WEIGHTS_0',
}

type AccessorStorageConstructor =
    typeof Int8Array | typeof Uint8Array | typeof Int16Array | typeof Uint16Array | typeof Uint32Array | typeof Float32Array;

type AccessorStorage = Int8Array | Uint8Array | Int16Array | Uint16Array | Uint32Array | Float32Array;

export interface IMeshOptions {
    normals: NormalImportSetting;
    tangents: TangentImportSetting;
}

export interface IGltfSemantic {
    name: string;
    baseType: number;
    type: string;
}

const GltfSemantics = {
    normal: {
        name: GltfSemanticName.NORMAL,
        baseType: GltfAccessorComponentType.FLOAT,
        type: GltfAccessorType.VEC3,
    } as IGltfSemantic,

    tangent: {
        name: GltfSemanticName.TANGENT,
        baseType: GltfAccessorComponentType.FLOAT,
        type: GltfAccessorType.VEC4,
    } as IGltfSemantic,
};

interface IPrimitiveViewer {
    getVertexCount(): number;
    getPositions(): Float32Array;
    getFaces(): AccessorStorage;
    getFaceCount(): number;
    getNormals(): Float32Array;
    getUVs(): AccessorStorage;
}

export class GltfConverter {

    get gltf() {
        return this._gltf;
    }

    get path() {
        return this._gltfFilePath;
    }
    private _nodePathTable: string[] | null = null;

    /**
     * The parent index of each node.
     */
    private _parents: number[] = [];

    /**
     * The root node of each skin.
     */
    private _skinRoots: number[] = [];

    constructor(private _gltf: GlTf, private _buffers: Buffer[], private _gltfFilePath: string) {
        // We require the scene graph is a disjoint union of strict trees.
        // This is also the requirement in glTf 2.0.
        if (this._gltf.nodes !== undefined) {
            this._parents = new Array(this._gltf.nodes.length).fill(-1);
            this._gltf.nodes.forEach((node, iNode) => {
                if (node.children !== undefined) {
                    for (const iChildNode of node.children) {
                        this._parents[iChildNode] = iNode;
                    }
                }
            });
        }

        if (this._gltf.skins) {
            this._skinRoots = new Array(this._gltf.skins.length).fill(-1);
        }

        this._nodePathTable = this._createNodePathTable();
    }

    public createMesh(iGltfMesh: number, options: IMeshOptions) {
        const gltfMesh = this._gltf.meshes![iGltfMesh];
        const bufferBlob = new BufferBlob();
        const vertexBundles = new Array<cc.IVertexBundle>();
        const minPosition = new cc.Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        const maxPosition = new cc.Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
        const primitives = gltfMesh.primitives.map((gltfPrimitive, primitiveIndex): cc.IPrimitive => {
            const { vertexBuffer,
                vertexCount,
                vertexStride,
                formats,
                posBuffer,
                posBufferAlign,
            } = this._readPrimitiveVertices(gltfPrimitive, minPosition, maxPosition, options);

            bufferBlob.setNextAlignment(0);
            vertexBundles.push({
                view: {
                    offset: bufferBlob.getLength(),
                    length: vertexBuffer.byteLength,
                    count: vertexCount,
                    stride: vertexStride,
                },
                attributes: formats,
            });
            bufferBlob.addBuffer(vertexBuffer);

            const primitive: cc.IPrimitive = {
                primitiveMode: this._getPrimitiveMode(gltfPrimitive.mode),
                vertexBundelIndices: [primitiveIndex],
            };

            // geometric info for raycast purposes

            if (primitive.primitiveMode >= cc.GFXPrimitiveMode.TRIANGLE_LIST) {
                bufferBlob.setNextAlignment(posBufferAlign);
                primitive.geometricInfo = {
                    view: {
                        offset: bufferBlob.getLength(),
                        length: posBuffer.byteLength,
                        count: posBuffer.byteLength / posBufferAlign,
                        stride: posBufferAlign,
                    },
                };
                bufferBlob.addBuffer(posBuffer);
            }

            if (gltfPrimitive.indices !== undefined) {
                const indicesAccessor = this._gltf.accessors![gltfPrimitive.indices];
                const indexStride = this._getBytesPerAttribute(indicesAccessor);
                const indicesData = new ArrayBuffer(indexStride * indicesAccessor.count);
                this._readAccessor(indicesAccessor, new DataView(indicesData));
                bufferBlob.setNextAlignment(indexStride);
                primitive.indexView = {
                    offset: bufferBlob.getLength(),
                    length: indicesData.byteLength,
                    count: indicesAccessor.count,
                    stride: this._getIndexStride(indicesAccessor.componentType),
                };
                bufferBlob.addBuffer(indicesData);
            }

            return primitive;
        });

        const meshStruct: cc.IMeshStruct = {
            primitives,
            vertexBundles,
            minPosition,
            maxPosition,
        };

        const mesh = new cc.Mesh();
        mesh.name = this._getGltfXXName(GltfAssetKind.Mesh, iGltfMesh);
        mesh.assign(meshStruct, bufferBlob.getCombined());
        return mesh;
    }

    public createSkeleton(iGltfSkin: number) {
        const gltfSkin = this._gltf.skins![iGltfSkin];
        const commongRoot = this._getSkinRoot(iGltfSkin);
        const inverseBindMatrices = new Array(gltfSkin.joints.length);
        if (gltfSkin.inverseBindMatrices === undefined) {
            // The default is that each matrix is a 4x4 identity matrix,
            // which implies that inverse-bind matrices were pre-applied.
            for (let i = 0; i < inverseBindMatrices.length; ++i) {

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

                inverseBindMatrices[i] = new cc.Mat4(
                    data[16 * i + 0], data[16 * i + 1], data[16 * i + 2], data[16 * i + 3],
                    data[16 * i + 4], data[16 * i + 5], data[16 * i + 6], data[16 * i + 7],
                    data[16 * i + 8], data[16 * i + 9], data[16 * i + 10], data[16 * i + 11],
                    data[16 * i + 12], data[16 * i + 13], data[16 * i + 14], data[16 * i + 15]
                );
            }
        }

        const skeleton = new cc.Skeleton();
        skeleton.name = this._getGltfXXName(GltfAssetKind.Skin, iGltfSkin);
        const rootPathPrefix = `${this._getNodePath(commongRoot)}/`;
        skeleton._joints = gltfSkin.joints.map((nodeIndex) => {
            if (nodeIndex === commongRoot) {
                return '';
            }
            const path = this._getNodePath(nodeIndex);
            if (path.startsWith(rootPathPrefix)) {
                return path.substr(rootPathPrefix.length);
            } else {
                return path;
            }
        });
        skeleton._inverseBindMatrices = inverseBindMatrices;

        return skeleton;
    }

    public createAnimation(iGltfAnimation: number) {
        const gltfAnimation = this._gltf.animations![iGltfAnimation];

        const rootCurveData: cc.ICurveData = { paths: {} };
        const getCurveData = (node: number) => {
            const path = this._getNodePath(node);
            let curveData = path.length === 0 ? rootCurveData : rootCurveData.paths![path];
            if (curveData === undefined) {
                curveData = {} as cc.ICurveData;
                rootCurveData.paths![path] = curveData;
            }
            return curveData;
        };
        let duration = 0;
        gltfAnimation.channels.forEach((gltfChannel) => {
            const targetNode = gltfChannel.target.node;
            if (targetNode === undefined) {
                // When node isn't defined, channel should be ignored.
                return;
            }

            const curveData = getCurveData(targetNode);

            const channelDuration = this._gltfChannelToCurveData(gltfAnimation, gltfChannel, curveData);
            duration = Math.max(channelDuration, duration);
        });

        if (this._gltf.nodes) {
            this._gltf.nodes.forEach((node, nodeIndex) => {
                const curveData = getCurveData(nodeIndex);
                curveData.props = curveData.props || {};
                if (!Reflect.has(curveData.props, 'position')) {
                    const v = new cc.Vec3();
                    if (node.translation) {
                        cc.vmath.vec3.set(v, node.translation[0], node.translation[1], node.translation[2]);
                    }
                    curveData.props.position = {
                        blending: 'additive3D',
                        keyframes: [{frame: 0, value: v}],
                    };
                }
                if (!Reflect.has(curveData.props, 'scale')) {
                    const v = new cc.Vec3();
                    if (node.scale) {
                        cc.vmath.vec3.set(v, node.scale[0], node.scale[1], node.scale[2]);
                    }
                    curveData.props.scale = {
                        blending: 'additive3D',
                        keyframes: [{frame: 0, value: v}],
                    };
                }
                if (!Reflect.has(curveData.props, 'rotation')) {
                    const v = new cc.Quat();
                    if (node.rotation) {
                        cc.vmath.quat.set(v, node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
                    }
                    curveData.props.rotation = {
                        blending: 'additiveQuat',
                        keyframes: [{frame: 0, value: v}],
                    };
                }
            });
        }

        const animationClip = new cc.AnimationClip();
        animationClip.name = this._getGltfXXName(GltfAssetKind.Animation, iGltfAnimation);
        animationClip.curveData = rootCurveData;
        animationClip.wrapMode = cc.WrapMode.Loop;
        animationClip._duration = duration;
        return animationClip;
    }

    public createMaterial(
        iGltfMaterial: number,
        gltfAssetFinder: IGltfAssetFinder,

        effectGetter: (name: string) => cc.EffectAsset) {
        const gltfMaterial = this._gltf.materials![iGltfMaterial];

        const material = new cc.Material();
        material.name = this._getGltfXXName(GltfAssetKind.Material, iGltfMaterial);
        material._effectAsset = effectGetter('db://internal/effects/builtin-standard.effect');

        const defines: cc.IDefineMap = {};
        const props: Record<string, any> = {};
        if (gltfMaterial.pbrMetallicRoughness) {
            const pbrMetallicRoughness = gltfMaterial.pbrMetallicRoughness;
            if (pbrMetallicRoughness.baseColorTexture !== undefined) {
                defines['USE_ALBEDO_MAP'] = true;
                props['albedoMap'] = gltfAssetFinder.find('textures', pbrMetallicRoughness.baseColorTexture.index);
            } else {
                let color = null;
                if (pbrMetallicRoughness.baseColorFactor) {
                    const c = pbrMetallicRoughness.baseColorFactor;

                    color = new cc.Color(c[0] * 255, c[1] * 255, c[2] * 255, c[3] * 255);
                } else {

                    color = new cc.Color(255, 255, 255, 255);
                }
                props['albedo'] = color;
            }
            if (pbrMetallicRoughness.metallicRoughnessTexture !== undefined) {
                defines['USE_PBR_MAP'] = true;
                // The metalness values are sampled from the B channel.
                // The roughness values are sampled from the G channel.
                // These values are linear. If other channels are present (R or A),
                // they are ignored for metallic-roughness calculations.
                defines['METALLIC_CHANNEL'] = 'b';
                defines['ROUGHNESS_CHANNEL'] = 'g';
                props['pbrMap'] = gltfAssetFinder.find('textures', pbrMetallicRoughness.metallicRoughnessTexture.index);
            }
        }

        if (gltfMaterial.normalTexture !== undefined) {
            defines['USE_NORMAL_MAP'] = true;
            props['normalMap'] = gltfAssetFinder.find('textures', gltfMaterial.normalTexture.index);
        }

        if (gltfMaterial.emissiveTexture !== undefined) {
            defines['USE_EMISSIVE_MAP'] = true;
            props['emissiveMap'] = gltfAssetFinder.find('textures', gltfMaterial.emissiveTexture.index);
        }

        if (gltfMaterial.emissiveFactor !== undefined) {
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
                defines['USE_ALPHA_TEST'] = true;
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
        const convertWrapMode = (gltfWrapMode?: number): WrapMode =>  {
            if (gltfWrapMode === undefined) {
                gltfWrapMode = GltfWrapMode.__DEFAULT;
            }
            switch (gltfWrapMode) {
                case GltfWrapMode.CLAMP_TO_EDGE: return 'clamp-to-edge';
                case GltfWrapMode.MIRRORED_REPEAT: return 'mirrored-repeat';
                case GltfWrapMode.REPEAT: return 'repeat';
                default:
                    console.error(`Unsupported wrapMode: ${gltfWrapMode}, 'repeat' is used.`);
                    return 'repeat';
            }
        };

        const convertMagFilter = (gltfFilter: number): Filter => {
            switch (gltfFilter) {
                case GltfTextureMagFilter.NEAREST: return 'nearest';
                case GltfTextureMagFilter.LINEAR: return 'linear';
                default:
                    console.warn(`Unsupported filter: ${gltfFilter}, 'linear' is used.`);
                    return 'linear';
            }
        };

        const convertMinFilter = (gltfFilter: number): Filter[] => {
            switch (gltfFilter) {
                case GltfTextureMinFilter.NEAREST: return ['nearest', 'none'];
                case GltfTextureMinFilter.LINEAR: return ['linear', 'none'];
                case GltfTextureMinFilter.NEAREST_MIPMAP_NEAREST: return ['nearest', 'nearest'];
                case GltfTextureMinFilter.LINEAR_MIPMAP_NEAREST: return ['linear', 'nearest'];
                case GltfTextureMinFilter.NEAREST_MIPMAP_LINEAR: return ['nearest', 'linear'];
                case GltfTextureMinFilter.LINEAR_MIPMAP_LINEAR: return ['linear', 'linear'];
                default:
                    console.warn(`Unsupported filter: ${gltfFilter}, 'linear' is used.`);
                    return ['linear', 'none'];
            }
        };

        if (gltfTexture.sampler === undefined) {
            userData.wrapModeS = 'repeat';
            userData.wrapModeT = 'repeat';
        } else {
            const gltfSampler = this._gltf.samplers![gltfTexture.sampler];
            userData.wrapModeS = convertWrapMode(gltfSampler.wrapS);
            userData.wrapModeT = convertWrapMode(gltfSampler.wrapT);
            userData.magfilter = gltfSampler.magFilter === undefined ?
                defaultMagFilter : convertMagFilter(gltfSampler.magFilter);
            userData.minfilter = defaultMinFilter;
            if (gltfSampler.minFilter !== undefined) {
                const [ min, mip ] = convertMinFilter(gltfSampler.minFilter);
                userData.minfilter = min;
                userData.mipfilter = mip;
            }
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

    public createScene(iGltfScene: number, gltfAssetFinder: IGltfAssetFinder): cc.Node {
        const sceneNode = this._getSceneNode(iGltfScene, gltfAssetFinder);
        if (this._gltf.animations !== undefined) {
            const animationComponent = sceneNode.addComponent(cc.AnimationComponent);
            let defaultAnim: cc.AnimationClip | null = null;
            this._gltf.animations.forEach((gltfAnimation, index) => {
                const animation = gltfAssetFinder.find<cc.AnimationClip>('animations', index);
                if (animation) {
                    if (!defaultAnim) {
                        defaultAnim = animation;
                    }
                    const animationName = this._getGltfXXName(GltfAssetKind.Animation, index);
                    animationComponent.addClip(animation, animationName);
                }
            });
            if (defaultAnim) {
                animationComponent._defaultClip = defaultAnim;
            }
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

    private _gltfChannelToCurveData(gltfAnimation: Animation, gltfChannel: AnimationChannel, curveData: cc.ICurveData) {
        let propName: string | undefined;
        if (gltfChannel.target.path === GltfAnimationChannelTargetPath.translation) {
            propName = 'position';
        } else if (gltfChannel.target.path === GltfAnimationChannelTargetPath.rotation) {
            propName = 'rotation';
        } else if (gltfChannel.target.path === GltfAnimationChannelTargetPath.scale) {
            propName = 'scale';
        } else {
            console.error(`Unsupported channel target path ${gltfChannel.target.path}.`);
            return 0;
        }

        const gltfSampler = gltfAnimation.samplers[gltfChannel.sampler];

        const inputAccessor = this._gltf.accessors![gltfSampler.input];
        const inputs = this._readAccessorIntoArray(inputAccessor) as Float32Array;
        let outputs = this._readAccessorIntoArray(this._gltf.accessors![gltfSampler.output]);
        if (!(outputs instanceof Float32Array)) {
            const normalizedOutput = new Float32Array(outputs.length);
            const normalize = (() => {
                if (outputs instanceof Int8Array) {
                    return (value: number) => {
                        return Math.max(value / 127.0, -1.0);
                    };
                } else if (outputs instanceof Uint8Array) {
                    return (value: number) => {
                        return value / 255.0;
                    };
                } else if (outputs instanceof Int16Array) {
                    return (value: number) => {
                        return Math.max(value / 32767.0, -1.0);
                    };
                } else if (outputs instanceof Uint16Array) {
                    return (value: number) => {
                        return value / 65535.0;
                    };
                } else {
                    return (value: number) => {
                        return value;
                    };
                }
            })();
            for (let i = 0; i < outputs.length; ++i) {
                normalizedOutput[i] = normalize(outputs[i]); // Do normalize.
            }
            outputs = normalizedOutput;
        }

        let values: any[] = [];
        let blendingFunctionName: 'additive1D' | 'additive3D' | 'additiveQuat' | null = null;
        if (propName === 'position' || propName === 'scale') {
            values = new Array<cc.Vec3>(outputs.length / 3);
            for (let i = 0; i < values.length; ++i) {
                values[i] = new cc.Vec3(outputs[i * 3 + 0], outputs[i * 3 + 1], outputs[i * 3 + 2]);
            }
            blendingFunctionName = 'additive3D';
        } else if (propName === 'rotation') {
            values = new Array<cc.Quat>(outputs.length / 4);
            for (let i = 0; i < values.length; ++i) {
                values[i] = new cc.Quat(outputs[i * 4 + 0], outputs[i * 4 + 1], outputs[i * 4 + 2], outputs[i * 4 + 3]);
            }
            blendingFunctionName = 'additiveQuat';
        }

        const keyframes = new Array<cc.IKeyframe>(inputs.length);
        for (let iFrame = 0; iFrame < keyframes.length; ++iFrame) {
            keyframes[iFrame] = {
                frame: inputs[iFrame],
                value: values[iFrame],
            };
        }
        curveData.props = curveData.props || {};
        curveData.props[propName] = { keyframes, blending: blendingFunctionName };
        return inputAccessor.max !== undefined && inputAccessor.max.length === 1 ? inputAccessor.max[0] : 0;
    }

    private _getParent(node: number) {
        return this._parents[node];
    }

    private _commonRoot(nodes: number[]) {
        if (nodes.length === 0) {
            return -1;
        }
        const roots = nodes.filter((node) => {
            const parent = this._getParent(node);
            return (nodes.findIndex((node) => node === parent)) < 0;
        });
        if (roots.length === 0) {
            // Circular
            return -1;
        } else if (roots.length === 1) {
            // The common root is living in nodes.
            return roots[0];
        } else {
            // There are multi roots in nodes.
            // Try find the common base.
            const parent = this._getParent(roots[0]);
            for (let i = 1; i < roots.length; ++i) {
                if (this._getParent(i) !== parent) {
                    return -1;
                }
            }
            return parent;
        }
    }

    private _getSkinRoot(skin: number) {
        let result = this._skinRoots[skin];
        if (result < 0) {
            result = this._commonRoot(this._gltf.skins![skin].joints);
            if (result < 0) {
                throw new Error(`Non-conforming glTf: skin joints do not have a common root.`);
            }
        }
        return result;
    }

    private _readPrimitiveVertices(gltfPrimitive: MeshPrimitive, minPosition: cc.Vec3, maxPosition: cc.Vec3, options: IMeshOptions) {
        const attributeNames = Object.getOwnPropertyNames(gltfPrimitive.attributes);

        // 统计出所有需要导出的属性，并计算它们在顶点缓冲区中的偏移以及整个顶点缓冲区的容量。
        let vertexStride = 0;
        let vertexCount = 0;
        let recalcNormal = options.normals === NormalImportSetting.recalculate || options.normals === NormalImportSetting.require;
        let recalcTangent = options.tangents === TangentImportSetting.recalculate || options.tangents === TangentImportSetting.require;
        const exportingAttributes: Array<{
            name: string;
            byteLength: number;
        }> = [];
        for (const attributeName of attributeNames) {
            if (attributeName === 'NORMAL') {
                if (options.normals === NormalImportSetting.exclude ||
                    options.normals === NormalImportSetting.recalculate) {
                    continue;
                } else if (options.normals === NormalImportSetting.require) {
                    recalcNormal = false;
                }
            } else if (attributeName === 'TANGENT') {
                if (options.tangents === TangentImportSetting.exclude ||
                    options.tangents === TangentImportSetting.recalculate) {
                    continue;
                } else if (options.tangents === TangentImportSetting.require) {
                    recalcTangent = false;
                }
            }
            const attributeAccessor = this._gltf.accessors![gltfPrimitive.attributes[attributeName]];
            const attributeByteLength = this._getBytesPerAttribute(attributeAccessor);
            vertexStride += attributeByteLength;
            // Validator: MESH_PRIMITIVE_UNEQUAL_ACCESSOR_COUNT
            vertexCount = attributeAccessor.count;
            exportingAttributes.push({
                name: attributeName,
                byteLength: attributeByteLength,
            });
        }

        let normalOffset = -1;
        if (recalcNormal) {
            normalOffset = vertexStride;
            vertexStride += 4 * 3;
        }

        let tangentOffset = -1;
        if (recalcTangent) {
            tangentOffset = vertexStride;
            vertexStride += 4 * 4;
        }

        // 创建顶点缓冲区。
        const vertexBuffer = new ArrayBuffer(vertexStride * vertexCount);

        // 写入属性。
        let currentByteOffset = 0;
        let posBuffer = new ArrayBuffer(0);
        let posBufferAlign = 0;
        const formats: cc.IGFXAttribute[] = [];
        for (const exportingAttribute of exportingAttributes) {
            const attributeName = exportingAttribute.name;
            const attributeAccessor = this._gltf.accessors![gltfPrimitive.attributes[attributeName]];
            const dataView = new DataView(vertexBuffer, currentByteOffset);
            this._readAccessor(attributeAccessor, dataView, vertexStride);
            currentByteOffset += exportingAttribute.byteLength;

            if (attributeName === GltfSemanticName.POSITION) {
                if (attributeAccessor.min) {
                    cc.vmath.vec3.min(minPosition, minPosition, new cc.vmath.vec3(
                        attributeAccessor.min[0], attributeAccessor.min[1], attributeAccessor.min[2]));
                }
                if (attributeAccessor.max) {
                    cc.vmath.vec3.max(maxPosition, maxPosition, new cc.vmath.vec3(
                        attributeAccessor.max[0], attributeAccessor.max[1], attributeAccessor.max[2]));
                }
                const comps = this._getComponentsPerAttribute(attributeAccessor.type);
                const bytes = this._getBytesPerComponent(attributeAccessor.componentType);
                posBuffer = new ArrayBuffer(comps * bytes * attributeAccessor.count);
                posBufferAlign = bytes;
                this._readAccessor(attributeAccessor, new DataView(posBuffer));
            }

            // const baseType = this._getAttributeBaseType(attributeAccessor.componentType);
            // const type = this._getAttributeType(attributeAccessor.type);

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
                format: this._getAttributeFormat(attributeAccessor.componentType, attributeAccessor.type),
                isNormalized: attributeAccessor.normalized || false,
            });
        }

        const appendVertexStreamF = (semantic: IGltfSemantic, offset: number, data: Float32Array) => {
            const nComponent = this._getComponentsPerAttribute(semantic.type);
            const dataView = new DataView(vertexBuffer, offset);
            for (let iVertex = 0; iVertex < vertexCount; ++iVertex) {
                for (let i = 0; i < nComponent; ++i) {
                    const v = data[iVertex * nComponent + i];
                    dataView.setFloat32(iVertex * vertexStride + i * 4, v, DataViewUseLittleEndian);
                }
            }
            formats.push({
                name: this._getGfxAttributeName(semantic.name),
                format: this._getAttributeFormat(GltfAccessorComponentType.FLOAT, semantic.type),
                isNormalized: false,
            });
        };

        let primitiveViewer: IPrimitiveViewer | undefined;
        const getPrimitiveViewer = () => {
            if (primitiveViewer === undefined) {
                primitiveViewer = this._makePrimitiveViewer(gltfPrimitive);
            }
            return primitiveViewer;
        };

        let normals: Float32Array | undefined;
        if (normalOffset >= 0) {
            // 计算法线
            normals = calculateNormals(getPrimitiveViewer());
            appendVertexStreamF(GltfSemantics.normal, normalOffset, normals);
            // // 验证。
            // if (Reflect.has(gltfPrimitive.attributes, GltfSemanticName.NORMAL)) {
            //     const embeddedNormalAccessor = this._gltf.accessors![gltfPrimitive.attributes[GltfSemanticName.NORMAL]];
            //     const embeddedNormals = this._readAccessorIntoArray(embeddedNormalAccessor);
            //     // return embeddedNormals as Float32Array;
            //     for (let i = 0; i < Math.min(normals.length, embeddedNormals.length); ++i) {
            //         if (embeddedNormals[i] !== normals[i]) {
            //             const an = normals[i];
            //             const bn = embeddedNormals[i];
            //             if (Math.abs(an - bn) > 0.01) {
            //                 // debugger;
            //             }
            //         }
            //     }
            // }
        }

        if (tangentOffset >= 0) {
            // 计算正切
            const tangents = calculateTangents(getPrimitiveViewer(), normals);
            appendVertexStreamF(GltfSemantics.tangent, tangentOffset, tangents);
        }

        return {
            vertexBuffer,
            vertexCount,
            vertexStride,
            formats,
            posBuffer,
            posBufferAlign,
        };
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

    private _makePrimitiveViewer(gltfPrimitive: MeshPrimitive): IPrimitiveViewer {
        const primitiveMode = gltfPrimitive.mode === undefined ? GltfPrimitiveMode.__DEFAULT : gltfPrimitive.mode;
        if (primitiveMode !== GltfPrimitiveMode.TRIANGLES) {
            throw new Error(`Normals calculation needs triangle primitive.`);
        }

        let vertexCount = 0;
        const attributeNames = Object.keys(gltfPrimitive.attributes);
        if (attributeNames.length !== 0) {
            vertexCount = this._gltf.accessors![gltfPrimitive.attributes[attributeNames[0]]].count;
        }

        let faces: AccessorStorage;
        if (gltfPrimitive.indices === undefined) {
            faces = new Float32Array(vertexCount);
            for (let i = 0; i < faces.length; ++i) {
                faces[i] = i;
            }
        } else {
            const indicesAccessor = this._gltf.accessors![gltfPrimitive.indices];
            faces = this._readAccessorIntoArray(indicesAccessor);
        }
        const nFaces = Math.floor(faces.length / 3);

        const cachedAttributes = new Map<string, AccessorStorage>();
        const getAttributes = (name: string) => {
            let result = cachedAttributes.get(name);
            if (result === undefined) {
                if (!Reflect.has(gltfPrimitive.attributes, name)) {
                    throw new Error(`Tangent calculation needs ${name}.`);
                }
                result = this._readAccessorIntoArray(this._gltf.accessors![gltfPrimitive.attributes[name]]);
                cachedAttributes.set(name, result);
            }
            return result;
        };

        const getVertexCount = () => vertexCount;
        const getFaces = () => faces;
        const getFaceCount = () => nFaces;
        const getPositions = () => {
            return getAttributes(GltfSemanticName.POSITION) as Float32Array;
        };
        const getNormals = () => {
            return getAttributes(GltfSemanticName.NORMAL) as Float32Array;
        };
        const getUVs = () => {
            return getAttributes(GltfSemanticName.TEXCOORD_0);
        };

        return {
            getVertexCount,
            getPositions,
            getFaces,
            getFaceCount,
            getNormals,
            getUVs,
        };
    }

    private _readAccessorIntoArray(gltfAccessor: Accessor) {
        const storageConstructor = this._getAttributeBaseTypeStorage(gltfAccessor.componentType);
        const result = new storageConstructor(gltfAccessor.count * this._getComponentsPerAttribute(gltfAccessor.type));
        this._readAccessor(gltfAccessor, createDataViewFromTypedArray(result));
        return result;
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

    private _getSceneNode(iGltfScene: number, gltfAssetFinder: IGltfAssetFinder) {
        const sceneName = this._getGltfXXName(GltfAssetKind.Scene, iGltfScene);
        const result = new cc.Node(sceneName);
        const gltfScene = this._gltf.scenes![iGltfScene];
        if (gltfScene.nodes !== undefined) {
            const mapping: Array<cc.Node | null> = new Array(this._gltf.nodes!.length).fill(null);
            for (const node of gltfScene.nodes) {
                const root = this._createEmptyNodeRecursive(node, mapping);
                root.parent = result;
            }
            mapping.forEach((node, iGltfNode) => {
                this._setupNode(iGltfNode, mapping, gltfAssetFinder);
            });
        }
        return result;
    }

    private _createEmptyNodeRecursive(iGltfNode: number, mapping: Array<cc.Node | null>): cc.Node {
        const gltfNode = this._gltf.nodes![iGltfNode];
        const result = this._createEmptyNode(iGltfNode);
        if (gltfNode.children !== undefined) {
            for (const child of gltfNode.children) {
                const childResult = this._createEmptyNodeRecursive(child, mapping);
                childResult.parent = result;
            }
        }
        mapping[iGltfNode] = result;
        return result;
    }

    private _setupNode(iGltfNode: number, mapping: Array<cc.Node | null>, gltfAssetFinder: IGltfAssetFinder) {
        const node = mapping[iGltfNode];
        if (node === null) {
            return;
        }
        const gltfNode = this._gltf.nodes![iGltfNode];
        if (gltfNode.mesh !== undefined) {
            let modelComponent: cc.ModelComponent | null = null;
            if (gltfNode.skin === undefined) {
                modelComponent = node.addComponent(cc.ModelComponent);
            } else {
                const skinningModelComponent = node.addComponent(cc.SkinningModelComponent);
                const skeleton = gltfAssetFinder.find<cc.Skeleton>('skeletons', gltfNode.skin);
                if (skeleton) {
                    skinningModelComponent._skeleton = skeleton;
                }
                const skinRoot = mapping[this._getSkinRoot(gltfNode.skin)];
                if (skinRoot === null) {
                    console.error(`glTf requires that skin joints must exists in same scene as node references it.`);
                } else {
                    skinningModelComponent._skinningRoot = skinRoot;
                }
                modelComponent = skinningModelComponent;
            }
            const mesh = gltfAssetFinder.find<cc.Mesh>('meshes', gltfNode.mesh);
            if (mesh) {
                modelComponent._mesh = mesh;
            }
            const gltfMesh = this.gltf.meshes![gltfNode.mesh];
            const materials = gltfMesh.primitives.map((gltfPrimitive) => {
                if (gltfPrimitive.material === undefined) {
                    return null;
                } else {
                    const material = gltfAssetFinder.find<cc.Material>('materials', gltfPrimitive.material);
                    if (material) {
                        return material;
                    }
                }
                return null;
            });
            modelComponent._materials = materials;
        }
    }

    private _createEmptyNode(iGltfNode: number) {
        const gltfNode = this._gltf.nodes![iGltfNode];
        const nodeName = this._getGltfXXName(GltfAssetKind.Node, iGltfNode);

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

    private _getPrimitiveMode(mode: number | undefined) {
        if (mode === undefined) {
            mode = GltfPrimitiveMode.__DEFAULT;
        }
        switch (mode) {
            case GltfPrimitiveMode.POINTS: return cc.GFXPrimitiveMode.POINT_LIST;
            case GltfPrimitiveMode.LINES: return cc.GFXPrimitiveMode.LINE_LIST;
            case GltfPrimitiveMode.LINE_LOOP: return cc.GFXPrimitiveMode.LINE_LOOP;
            case GltfPrimitiveMode.LINE_STRIP: return cc.GFXPrimitiveMode.LINE_STRIP;
            case GltfPrimitiveMode.TRIANGLES: return cc.GFXPrimitiveMode.TRIANGLE_LIST;
            case GltfPrimitiveMode.TRIANGLE_STRIP: return cc.GFXPrimitiveMode.TRIANGLE_STRIP;
            case GltfPrimitiveMode.TRIANGLE_FAN: return cc.GFXPrimitiveMode.TRIANGLE_FAN;
            default:
                throw new Error(`Unrecognized primitive mode: ${mode}.`);
        }
    }

    private _getAttributeFormat(componentType: number, type: string) {
        switch (componentType) {
            case GltfAccessorComponentType.BYTE: {
                switch (type) {
                    case GltfAccessorType.SCALAR: return cc.GFXFormat.R8SN;
                    case GltfAccessorType.VEC2: return cc.GFXFormat.RG8SN;
                    case GltfAccessorType.VEC3: return cc.GFXFormat.RGB8SN;
                    case GltfAccessorType.VEC4: return cc.GFXFormat.RGBA8SN;
                    default: throw new Error(`Unrecognized attribute type: ${type}.`);
                }
            }
            case GltfAccessorComponentType.UNSIGNED_BYTE: {
                switch (type) {
                    case GltfAccessorType.SCALAR: return cc.GFXFormat.R8;
                    case GltfAccessorType.VEC2: return cc.GFXFormat.RG8;
                    case GltfAccessorType.VEC3: return cc.GFXFormat.RGB8;
                    case GltfAccessorType.VEC4: return cc.GFXFormat.RGBA8;
                    default: throw new Error(`Unrecognized attribute type: ${type}.`);
                }
            }
            case GltfAccessorComponentType.SHORT: {
                switch (type) {
                    case GltfAccessorType.SCALAR: return cc.GFXFormat.R16I;
                    case GltfAccessorType.VEC2: return cc.GFXFormat.RG16I;
                    case GltfAccessorType.VEC3: return cc.GFXFormat.RGB16I;
                    case GltfAccessorType.VEC4: return cc.GFXFormat.RGBA16I;
                    default: throw new Error(`Unrecognized attribute type: ${type}.`);
                }
            }
            case GltfAccessorComponentType.UNSIGNED_SHORT: {
                switch (type) {
                    case GltfAccessorType.SCALAR: return cc.GFXFormat.R16UI;
                    case GltfAccessorType.VEC2: return cc.GFXFormat.RG16UI;
                    case GltfAccessorType.VEC3: return cc.GFXFormat.RGB16UI;
                    case GltfAccessorType.VEC4: return cc.GFXFormat.RGBA16UI;
                    default: throw new Error(`Unrecognized attribute type: ${type}.`);
                }
            }
            case GltfAccessorComponentType.UNSIGNED_INT: {
                switch (type) {
                    case GltfAccessorType.SCALAR: return cc.GFXFormat.R32UI;
                    case GltfAccessorType.VEC2: return cc.GFXFormat.RG32UI;
                    case GltfAccessorType.VEC3: return cc.GFXFormat.RGB32UI;
                    case GltfAccessorType.VEC4: return cc.GFXFormat.RGBA32UI;
                    default: throw new Error(`Unrecognized attribute type: ${type}.`);
                }
            }
            case GltfAccessorComponentType.FLOAT: {
                switch (type) {
                    case GltfAccessorType.SCALAR: return cc.GFXFormat.R32F;
                    case GltfAccessorType.VEC2: return cc.GFXFormat.RG32F;
                    case GltfAccessorType.VEC3: return cc.GFXFormat.RGB32F;
                    case GltfAccessorType.VEC4: return cc.GFXFormat.RGBA32F;
                    default: throw new Error(`Unrecognized attribute type: ${type}.`);
                }
            }
            default: throw new Error(`Unrecognized component type: ${componentType}.`);
        }
    }

    private _getAttributeBaseTypeStorage(componentType: number): AccessorStorageConstructor {
        switch (componentType) {
            case GltfAccessorComponentType.BYTE: return Int8Array;
            case GltfAccessorComponentType.UNSIGNED_BYTE: return Uint8Array;
            case GltfAccessorComponentType.SHORT: return Int16Array;
            case GltfAccessorComponentType.UNSIGNED_SHORT: return Uint16Array;
            case GltfAccessorComponentType.UNSIGNED_INT: return Uint32Array;
            case GltfAccessorComponentType.FLOAT: return Float32Array;
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

    private _getIndexStride(componentType: number) {
        switch (componentType) {
            case GltfAccessorComponentType.UNSIGNED_BYTE: return 1;
            case GltfAccessorComponentType.UNSIGNED_SHORT: return 2;
            case GltfAccessorComponentType.UNSIGNED_INT: return 4;
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
            case GltfAccessorType.SCALAR: return 1;
            case GltfAccessorType.VEC2: return 2;
            case GltfAccessorType.VEC3: return 3;
            case GltfAccessorType.VEC4: case GltfAccessorType.MAT2: return 4;
            case GltfAccessorType.MAT3: return 9;
            case GltfAccessorType.MAT4: return 16;
            default:
                throw new Error(`Unrecognized attribute type: ${type}.`);
        }
    }

    private _getBytesPerComponent(componentType: number) {
        switch (componentType) {
            case GltfAccessorComponentType.BYTE: case GltfAccessorComponentType.UNSIGNED_BYTE: return 1;
            case GltfAccessorComponentType.SHORT: case GltfAccessorComponentType.UNSIGNED_SHORT: return 2;
            case GltfAccessorComponentType.UNSIGNED_INT: case GltfAccessorComponentType.FLOAT: return 4;
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

    private _getGfxAttributeName(name: string) {
        switch (name) {
            case GltfSemanticName.POSITION: return cc.GFXAttributeName.ATTR_POSITION;
            case GltfSemanticName.NORMAL: return cc.GFXAttributeName.ATTR_NORMAL;
            case GltfSemanticName.TANGENT: return cc.GFXAttributeName.ATTR_TANGENT;
            case GltfSemanticName.COLOR_0: return cc.GFXAttributeName.ATTR_COLOR;
            case GltfSemanticName.TEXCOORD_0: return cc.GFXAttributeName.ATTR_TEX_COORD;
            case GltfSemanticName.TEXCOORD_1: return cc.GFXAttributeName.ATTR_TEX_COORD1;
            case 'TEXCOORD_2': return cc.GFXAttributeName.ATTR_TEX_COORD2;
            case 'TEXCOORD_3': return cc.GFXAttributeName.ATTR_TEX_COORD3;
            case GltfSemanticName.JOINTS_0: return cc.GFXAttributeName.ATTR_JOINTS;
            case GltfSemanticName.WEIGHTS_0: return cc.GFXAttributeName.ATTR_WEIGHTS;
            default:
                throw new Error(`Unrecognized attribute type: ${name}`);
        }
    }

    private _getComponentReader(componentType: number): (buffer: DataView, offset: number) => number {
        switch (componentType) {
            case GltfAccessorComponentType.BYTE: return (buffer, offset) => buffer.getInt8(offset);
            case GltfAccessorComponentType.UNSIGNED_BYTE: return (buffer, offset) => buffer.getUint8(offset);
            case GltfAccessorComponentType.SHORT: return (buffer, offset) => buffer.getInt16(offset, DataViewUseLittleEndian);
            case GltfAccessorComponentType.UNSIGNED_SHORT: return (buffer, offset) => buffer.getUint16(offset, DataViewUseLittleEndian);
            case GltfAccessorComponentType.UNSIGNED_INT: return (buffer, offset) => buffer.getUint32(offset, DataViewUseLittleEndian);
            case GltfAccessorComponentType.FLOAT: return (buffer, offset) => buffer.getFloat32(offset, DataViewUseLittleEndian);
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

    private _getComponentWriter(componentType: number): (buffer: DataView, offset: number, value: number) => void {
        switch (componentType) {
            case GltfAccessorComponentType.BYTE: return (buffer, offset, value) => buffer.setInt8(offset, value);
            case GltfAccessorComponentType.UNSIGNED_BYTE: return (buffer, offset, value) => buffer.setUint8(offset, value);
            case GltfAccessorComponentType.SHORT: return (buffer, offset, value) => buffer.setInt16(offset, value, DataViewUseLittleEndian);
            case GltfAccessorComponentType.UNSIGNED_SHORT: return (buffer, offset, value) => buffer.setUint16(offset, value, DataViewUseLittleEndian);
            case GltfAccessorComponentType.UNSIGNED_INT: return (buffer, offset, value) => buffer.setUint32(offset, value, DataViewUseLittleEndian);
            case GltfAccessorComponentType.FLOAT: return (buffer, offset, value) => buffer.setFloat32(offset, value, DataViewUseLittleEndian);
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

    private _getGltfXXName(assetKind: GltfAssetKind, index: number) {
        const assetsArrayName: {
            [x: number]: string
        } = {
            [GltfAssetKind.Animation]: 'animations',
            [GltfAssetKind.Image]: 'images',
            [GltfAssetKind.Material]: 'materials',
            [GltfAssetKind.Node]: 'nodes',
            [GltfAssetKind.Skin]: 'skins',
            [GltfAssetKind.Texture]: 'textures',
            [GltfAssetKind.Scene]: 'scenes',
        };

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

function calculateNormals(gltfPrimitiveViewer: IPrimitiveViewer): Float32Array {
    const vertexCount = gltfPrimitiveViewer.getVertexCount();
    const positions = gltfPrimitiveViewer.getPositions();
    const indices = gltfPrimitiveViewer.getFaces();
    const nFaces = gltfPrimitiveViewer.getFaceCount();
    const normals = new Float32Array(3 * vertexCount);
    const a = new cc.vmath.vec3();
    const b = new cc.vmath.vec3();
    const c = new cc.vmath.vec3();
    const u = new cc.vmath.vec3();
    const v = new cc.vmath.vec3();
    const n = new cc.vmath.vec3();
    const getPosition = (iVertex: number, out: cc.vmath.vec3) => {
        cc.vmath.vec3.set(out, positions[iVertex * 3 + 0], positions[iVertex * 3 + 1], positions[iVertex * 3 + 2]);
    };
    const addFaceNormal = (iVertex: number, normal: cc.vmath.vec3) => {
        normals[iVertex * 3 + 0] += normal.x;
        normals[iVertex * 3 + 1] += normal.y;
        normals[iVertex * 3 + 2] += normal.z;
    };
    for (let iFace = 0; iFace < nFaces; ++iFace) {
        const ia = indices[iFace * 3 + 0];
        const ib = indices[iFace * 3 + 1];
        const ic = indices[iFace * 3 + 2];
        getPosition(ia, a);
        getPosition(ib, b);
        getPosition(ic, c);

        // Calculate normal of triangle [a, b, c].
        cc.vmath.vec3.subtract(u, b, a);
        cc.vmath.vec3.subtract(v, c, a);
        cc.vmath.vec3.cross(n, u, v);

        addFaceNormal(ia, n);
        addFaceNormal(ib, n);
        addFaceNormal(ic, n);
    }
    for (let iVertex = 0; iVertex < vertexCount; ++iVertex) {
        cc.vmath.vec3.set(n, normals[iVertex * 3 + 0], normals[iVertex * 3 + 1], normals[iVertex * 3 + 2]);
        cc.vmath.vec3.normalize(n, n);
        normals[iVertex * 3 + 0] = n.x;
        normals[iVertex * 3 + 1] = n.y;
        normals[iVertex * 3 + 2] = n.z;
    }

    return normals;
}

function calculateTangents(gltfPrimitiveViewer: IPrimitiveViewer, overrideNormals?: Float32Array): Float32Array {
    /// http://www.terathon.com/code/tangent.html
    const vertexCount = gltfPrimitiveViewer.getVertexCount();
    const positions = gltfPrimitiveViewer.getPositions();
    const indices = gltfPrimitiveViewer.getFaces();
    const nFaces = gltfPrimitiveViewer.getFaceCount();
    const normals = overrideNormals ? overrideNormals : gltfPrimitiveViewer.getNormals();
    const uvs = gltfPrimitiveViewer.getUVs();
    const tangents = new Float32Array(4 * vertexCount);
    const tan1 = new Float32Array(3 * vertexCount);
    const tan2 = new Float32Array(3 * vertexCount);
    const v0 = new cc.vmath.vec3();
    const v1 = new cc.vmath.vec3();
    const v2 = new cc.vmath.vec3();
    const uv0 = new cc.vmath.vec2();
    const uv1 = new cc.vmath.vec2();
    const uv2 = new cc.vmath.vec2();
    const sdir = new cc.vmath.vec3();
    const tdir = new cc.vmath.vec3();
    const n = new cc.vmath.vec3();
    const t = new cc.vmath.vec3();
    const getPosition = (iVertex: number, out: cc.vmath.vec3) => {
        cc.vmath.vec3.set(out, positions[iVertex * 3 + 0], positions[iVertex * 3 + 1], positions[iVertex * 3 + 2]);
    };
    const getUV = (iVertex: number, out: cc.vmath.vec2) => {
        cc.vmath.vec2.set(out, uvs[iVertex * 2 + 0], uvs[iVertex * 2 + 1]);
    };
    const addTan = (tans: Float32Array, iVertex: number, val: cc.vmath.vec3) => {
        tans[iVertex * 3 + 0] += val.x;
        tans[iVertex * 3 + 1] += val.y;
        tans[iVertex * 3 + 2] += val.z;
    };
    for (let iFace = 0; iFace < nFaces; ++iFace) {
        const i0 = indices[iFace * 3 + 0];
        const i1 = indices[iFace * 3 + 1];
        const i2 = indices[iFace * 3 + 2];

        getPosition(i0, v0);
        getPosition(i1, v1);
        getPosition(i2, v2);

        getUV(i0, uv0);
        getUV(i1, uv1);
        getUV(i2, uv2);

        const x1 = v1.x - v0.x;
        const x2 = v2.x - v0.x;
        const y1 = v1.y - v0.y;
        const y2 = v2.y - v0.y;
        const z1 = v1.z - v0.z;
        const z2 = v2.z - v0.z;

        const s1 = uv1.x - uv0.x;
        const s2 = uv2.x - uv0.x;
        const t1 = uv1.y - uv0.y;
        const t2 = uv2.y - uv0.y;

        const div = (s1 * t2 - s2 * t1);
        if (div !== 0.0) {
            const r = 1.0 / div;
            cc.vmath.vec3.set(sdir,
                (t2 * x1 - t1 * x2) * r,
                (t2 * y1 - t1 * y2) * r,
                (t2 * z1 - t1 * z2) * r);
            cc.vmath.vec3.set(tdir,
                (s1 * x2 - s2 * x1) * r,
                (s1 * y2 - s2 * y1) * r,
                (s1 * z2 - s2 * z1) * r);
        } else {
            cc.vmath.vec3.set(sdir, 1.0, 0.0, 0.0);
            cc.vmath.vec3.set(tdir, 0.0, 1.0, 0.0);
        }

        addTan(tan1, i0, sdir);
        addTan(tan1, i1, sdir);
        addTan(tan1, i2, sdir);

        addTan(tan2, i0, tdir);
        addTan(tan2, i1, tdir);
        addTan(tan2, i2, tdir);
    }
    const tan2v = new cc.vmath.vec3();
    const vv = new cc.vmath.vec3();
    for (let iVertex = 0; iVertex < vertexCount; ++iVertex) {
        // Gram-Schmidt orthogonalize
        // tangent[a] = (t - n * Dot(n, t)).Normalize();
        // Calculate handedness
        // tangent[a].w = (Dot(Cross(n, t), tan2[a]) < 0.0F) ? -1.0F : 1.0F;
        cc.vmath.vec3.set(n, normals[iVertex * 3 + 0], normals[iVertex * 3 + 1], normals[iVertex * 3 + 2]);
        cc.vmath.vec3.set(t, tan1[iVertex * 3 + 0], tan1[iVertex * 3 + 1], tan1[iVertex * 3 + 2]);
        cc.vmath.vec3.set(tan2v, tan2[iVertex * 3 + 0], tan2[iVertex * 3 + 1], tan2[iVertex * 3 + 2]);

        cc.vmath.vec3.normalize(vv,
            cc.vmath.vec3.subtract(vv,
                t, cc.vmath.vec3.scale(vv,
                    n, cc.vmath.vec3.dot(
                        n, t))));
        tangents[4 * iVertex + 0] = vv.x;
        tangents[4 * iVertex + 1] = vv.y;
        tangents[4 * iVertex + 2] = vv.z;

        const sign = cc.vmath.vec3.dot(
            cc.vmath.vec3.cross(
                vv, n, t), tan2v) < 0 ? -1 : 1;
        tangents[4 * iVertex + 3] = sign;
    }

    return tangents;
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

const DataViewUseLittleEndian = true;
