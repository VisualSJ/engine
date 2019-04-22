
type Constructor<T = {}> = new (...args: any[]) => T;

declare namespace cc {
    export class Vec2 {
        x: number;
        y: number;
        constructor(x?: number, y?: number);
    }

    export class Vec3 {
        x: number;
        y: number;
        z: number;
        constructor(x?: number, y?: number, z?: number);
    }

    export class Vec4 {
        x: number;
        y: number;
        z: number;
        w: number;
        constructor(x?: number, y?: number, z?: number, w?: number);
    }

    export class Quat {
        x: number;
        y: number;
        z: number;
        w: number;
        constructor(x?: number, y?: number, z?: number, w?: number);
    }

    export class Mat4 {
        constructor(m00?: number, m01?: number, m02?: number, m03?: number,
            m04?: number, m05?: number, m06?: number, m07?: number,
            m08?: number, m09?: number, m10?: number, m11?: number,
            m12?: number, m13?: number, m14?: number, m15?: number);
    }

    export class Color {
        constructor(r: number, g: number, b: number, a: number);
    }

    export namespace vmath {
        export class vec2 {
            x: number;
            y: number;
            constructor(x?: number, y?: number);
            static set(out: vec2, x: number, y: number): vec2;
        }
        export class vec3 {
            x: number;
            y: number;
            z: number;
            constructor(x?: number, y?: number, z?: number);
            static set(out: vec3, x: number, y: number, z: number): vec3;
            static normalize(out: vec3, a: vec3): vec3;
            static max(out: vec3, a: vec3, b: vec3): vec3;
            static min(out: vec3, a: vec3, b: vec3): vec3;
            static subtract(out: vec3, a: vec3, b: vec3): vec3;
            static cross(out: vec3, a: vec3, b: vec3): vec3;
            static dot(a: vec3, b: vec3): number;
            static scale(out: vec3, a: vec3, b: number): vec3;
        }
        export class quat {
            x: number;
            y: number;
            z: number;
            w: number;
            constructor(x?: number, y?: number, z?: number, w?: number);
            static set(out: quat, x: number, y: number, z: number, w: number): quat;
        }
        export class mat4 {
            constructor (...elements: number[]);
            static getTranslation(out: vec3, mat: mat4): vec3;
            static getRotation(out: quat, mat: mat4): quat;
            static getScaling(out: vec3, mat: mat4): vec3;
        }
    }

    export class Component {
        _id: any;
        node: Node;
    }

    export namespace Component {
        export class EventHandler {
            target: any;
        }
    }

    export class _BaseNode {
        _components: Component[];
        _prefab: any;
        _id: any;
        name: string;
        uuid: string;
        parent: this | null;
        children: this[];
        constructor(name?: string);
        addComponent<T extends Component>(componentConstructor: Constructor<T>): T;
        isChildOf(node: this): boolean;
    }

    export class Node extends _BaseNode {
        setPosition(position: vmath.vec3): void;
        setPosition(x: number, y: number, z: number): void;
        setRotation(rotation: vmath.quat): void;
        setRotation(x: number, y: number, z: number, w: number): void;
        setScale(scale: vmath.vec3): void;
        setScale(x: number, y: number, z: number): void;
    }

    export class Prefab {
        data: Node;
    }

    export class _PrefabInfo {
        asset: Prefab;
        root: Node;
        fileId: string;
    }

    function isValid(value: any): boolean;

    export class ModelComponent extends Component {
        _mesh: Mesh;
        _materials: (Material | null)[];
    }

    export class SkinningModelComponent extends ModelComponent {
        _skeleton: Skeleton;
        _skinningRoot: Node | null;
    }

    export class AnimationComponent extends Component {
        _defaultClip: AnimationClip;
        addClip (clip: AnimationClip, newName?: string): void;
    }

    export class Asset {
        name: string;
    }

    export interface IBufferView {
        offset: number;
        length: number;
        count: number;
        stride: number;
    }
    
    export const enum AttributeBaseType {
        /**
         * 8 bits signed integer.
         */
        INT8,
    
        /**
         * 8 bits unsigned integer.
         */
        UINT8,
    
        /**
         * 16 bits signed integer.
         */
        INT16,
    
        /**
         * 16 bits unsigned integer.
         */
        UINT16,
    
        /**
         * 32 bits signed integer.
         */
        INT32,
    
        /**
         * 32 bits unsigned integer.
         */
        UINT32,
    
        /**
         * 32 bits floating number.
         */
        FLOAT32,
    }
    
    export const enum AttributeType {
        /**
         * Scalar.
         */
        SCALAR,
    
        /**
         * 2 components vector.
         */
        VEC2,
    
        /**
         * 3 components vector.
         */
        VEC3,
    
        /**
         * 4 components vector.
         */
        VEC4,
    }
    
    export interface IVertexBundle {
        /**
         * The data view of this bundle.
         * This range of data is essentially mapped to a GPU vertex buffer.
         */
        view: IBufferView;

        /**
         * Attributes.
         */
        attributes: IGFXAttribute[];
    }
    
    /**
     * A primitive is a geometry constituted with a list of
     * same topology primitive graphic(such as points, lines or triangles).
     */
    export interface IPrimitive {
        /**
         * The vertex bundles that this primitive use.
         */
        vertexBundelIndices: number[];

        /**
         * This primitive's topology.
         */
        primitiveMode: GFXPrimitiveMode;

        indexView?: IBufferView;

        /**
         * Geometric info for raycast purposes.
         */
        geometricInfo?: {
            doubleSided?: boolean;
            view: IBufferView;
        };
    }
    
    /**
     * Describes a mesh.
     */
    export interface IMeshStruct {
        /**
         * The vertex bundles that this mesh owns.
         */
        vertexBundles: IVertexBundle[];
    
        /**
         * The primitives that this mesh owns.
         */
        primitives: IPrimitive[];
    
        /**
         * The min position of this mesh's vertices.
         */
        // @ts-ignore
        minPosition: Vec3;
    
        /**
         * The max position of this mesh's vertices.
         */
        // @ts-ignore
        maxPosition: Vec3;
    }
    
    // for raycast purpose
    export type IBArray = Uint8Array | Uint16Array | Uint32Array;
    
    export interface IGeometricInfo {
        positions: Float32Array;
        indices: IBArray;
        doubleSided?: boolean;
    }

    export class RawAsset extends Asset {
        _setRawAsset(x: string): void;
    }

    export class Mesh extends RawAsset {
        data: ArrayBuffer | SharedArrayBuffer;
        assign(struct: IMeshStruct, data: ArrayBuffer | SharedArrayBuffer): void;
    }

    export class ImageAsset extends RawAsset {

    }

    export class EffectAsset extends Asset {

    }

    export interface IDefineMap { [name: string]: number | boolean | string; }

    export class Material extends Asset {
        _effectAsset: EffectAsset;
        _techIdx: number;
        _defines: any;
        _props: any;
    }

    export class Skeleton extends Asset {
        _joints: string[];
        _inverseBindMatrices: Mat4[];
    }

    export type CurveValue = any;

    export type MotionPath = Vec2[];

    type EasingMethod = 'linear' | number[];

    interface IPropertyCurveDataDetail {
        blending?: 'additive1D' | 'additive3D' | 'additiveQuat' | null;
        keys: number;
        values: CurveValue[];
        easingMethod?: EasingMethod;
        easingMethods?: EasingMethod[];
        motionPaths?: MotionPath | MotionPath[];
    }

    type PropertyCurveData = IPropertyCurveDataDetail;

    export interface ICurveData {
        props?: {
            [propertyName: string]: PropertyCurveData;
        };
        comps?: {
            [componentName: string]: {
                [propertyName: string]: PropertyCurveData;
            };
        };
        paths?: {
            [path: string]: ICurveData;
        };
    }

    export interface IAnimationEvent {
        frame: number;
        func: string;
        params: string[];
    }

    /**
     * !#en Specifies how time is treated when it is outside of the keyframe range of an Animation.
     * !#zh 动画使用的循环模式。
     */
    export enum WrapMode {
        /**
         * !#en Reads the default wrap mode set higher up.
         * !#zh 向 Animation Component 或者 AnimationClip 查找 wrapMode
         */
        Default,

        /**
         * !#en All iterations are played as specified.
         * !#zh 动画只播放一遍
         */
        Normal,

        /**
         * !#en All iterations are played in the reverse direction from the way they are specified.
         * !#zh 从最后一帧或结束位置开始反向播放，到第一帧或开始位置停止
         */
        Reverse,

        /**
         * !#en When time reaches the end of the animation, time will continue at the beginning.
         * !#zh 循环播放
         */
        Loop,

        /**
         * !#en All iterations are played in the reverse direction from the way they are specified.
         * And when time reaches the start of the animation, time will continue at the ending.
         * !#zh 反向循环播放
         */
        LoopReverse,

        /**
         * !#en Even iterations are played as specified, odd iterations are played in the reverse direction from the way they
         * are specified.
         * !#zh 从第一帧播放到最后一帧，然后反向播放回第一帧，到第一帧后再正向播放，如此循环
         */
        PingPong,

        /**
         * !#en Even iterations are played in the reverse direction from the way they are specified, odd iterations are played
         * as specified.
         * !#zh 从最后一帧开始反向播放，其他同 PingPong
         */
        PingPongReverse,
    }

    export class AnimationClip extends Asset {
        sample: number;
        speed: number;
        wrapMode: WrapMode;
        curveData: ICurveData;
        events: IAnimationEvent[];
        _duration: number;
        _keys: number[][];
    }

    export const enum GFXPrimitiveMode {
        POINT_LIST,
        LINE_LIST,
        LINE_STRIP,
        LINE_LOOP,
        LINE_LIST_ADJACENCY,
        LINE_STRIP_ADJACENCY,
        ISO_LINE_LIST,
        // raycast detectable:
        TRIANGLE_LIST,
        TRIANGLE_STRIP,
        TRIANGLE_FAN,
        TRIANGLE_LIST_ADJACENCY,
        TRIANGLE_STRIP_ADJACENCY,
        TRIANGLE_PATCH_ADJACENCY,
        QUAD_PATCH_LIST,
    }

    export const enum GFXAttributeName {
        ATTR_POSITION = 'a_position',
        ATTR_NORMAL = 'a_normal',
        ATTR_TANGENT = 'a_tangent',
        ATTR_BITANGENT = 'a_bitangent',
        ATTR_WEIGHTS = 'a_weights',
        ATTR_JOINTS = 'a_joints',
        ATTR_COLOR = 'a_color',
        ATTR_COLOR1 = 'a_color1',
        ATTR_COLOR2 = 'a_color2',
        ATTR_TEX_COORD = 'a_texCoord',
        ATTR_TEX_COORD1 = 'a_texCoord1',
        ATTR_TEX_COORD2 = 'a_texCoord2',
        ATTR_TEX_COORD3 = 'a_texCoord3',
        ATTR_TEX_COORD4 = 'a_texCoord4',
        ATTR_TEX_COORD5 = 'a_texCoord5',
        ATTR_TEX_COORD6 = 'a_texCoord6',
        ATTR_TEX_COORD7 = 'a_texCoord7',
        ATTR_TEX_COORD8 = 'a_texCoord8',
    }

    export enum GFXFormat {

        UNKNOWN,
    
        A8,
        L8,
        LA8,
    
        R8,
        R8SN,
        R8UI,
        R8I,
        R16F,
        R16UI,
        R16I,
        R32F,
        R32UI,
        R32I,
    
        RG8,
        RG8SN,
        RG8UI,
        RG8I,
        RG16F,
        RG16UI,
        RG16I,
        RG32F,
        RG32UI,
        RG32I,
    
        RGB8,
        SRGB8,
        RGB8SN,
        RGB8UI,
        RGB8I,
        RGB16F,
        RGB16UI,
        RGB16I,
        RGB32F,
        RGB32UI,
        RGB32I,
    
        RGBA8,
        SRGB8_A8,
        RGBA8SN,
        RGBA8UI,
        RGBA8I,
        RGBA16F,
        RGBA16UI,
        RGBA16I,
        RGBA32F,
        RGBA32UI,
        RGBA32I,
    
        // Special Format
        R5G6B5,
        R11G11B10F,
        RGB5A1,
        RGBA4,
        RGB10A2,
        RGB10A2UI,
        RGB9E5,
    
        // Depth-Stencil Format
        D16,
        D16S8,
        D24,
        D24S8,
        D32F,
        D32F_S8,
    
        // Compressed Format
    
        // Block Compression Format, DDS (DirectDraw Surface)
        // DXT1: 3 channels (5:6:5), 1/8 origianl size, with 0 or 1 bit of alpha
        BC1,
        BC1_ALPHA,
        BC1_SRGB,
        BC1_SRGB_ALPHA,
        // DXT3: 4 channels (5:6:5), 1/4 origianl size, with 4 bits of alpha
        BC2,
        BC2_SRGB,
        // DXT5: 4 channels (5:6:5), 1/4 origianl size, with 8 bits of alpha
        BC3,
        BC3_SRGB,
        // 1 channel (8), 1/4 origianl size
        BC4,
        BC4_SNORM,
        // 2 channels (8:8), 1/2 origianl size
        BC5,
        BC5_SNORM,
        // 3 channels (16:16:16), half-floating point, 1/6 origianl size
        // UF16: unsigned float, 5 exponent bits + 11 mantissa bits
        // SF16: signed float, 1 signed bit + 5 exponent bits + 10 mantissa bits
        BC6H_UF16,
        BC6H_SF16,
        // 4 channels (4~7 bits per channel) with 0 to 8 bits of alpha, 1/3 original size
        BC7,
        BC7_SRGB,
    
        // Ericsson Texture Compression Format
        ETC_RGB8,
        ETC2_RGB8,
        ETC2_SRGB8,
        ETC2_RGB8_A1,
        ETC2_SRGB8_A1,
        ETC2_RGBA8,
        ETC2_SRGB8_A8,
        EAC_R11,
        EAC_R11SN,
        EAC_RG11,
        EAC_RG11SN,
    
        // PVRTC (PowerVR)
        PVRTC_RGB2,
        PVRTC_RGBA2,
        PVRTC_RGB4,
        PVRTC_RGBA4,
        PVRTC2_2BPP,
        PVRTC2_4BPP,
    }

    export interface IGFXAttribute {
        binding?: number;
        name: string;
        format: GFXFormat;
        isNormalized?: boolean;
        stream?: number;
        isInstanced?: boolean;
    }
}