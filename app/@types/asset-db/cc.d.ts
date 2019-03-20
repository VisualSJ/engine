
type Constructor<T = {}> = new (...args: any[]) => T;

declare namespace cc {
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
        }
        export class quat {
            x: number;
            y: number;
            z: number;
            w: number;
            constructor(x?: number, y?: number, z?: number, w?: number);
        }
    }

    export class Component {
        _id: any;
        node: Node;
    }

    export class Node {
        _components: Component[];
        _prefab: any;
        _id: any;
        name: string;
        uuid: string;
        parent: Node | null;
        constructor(name?: string);
        addComponent<T extends Component>(componentConstructor: Constructor<T>): T;
        setPosition(position: vmath.vec3): void;
        setPosition(x: number, y: number, z: number): void;
        setRotation(rotation: vmath.quat): void;
        setRotation(x: number, y: number, z: number, w: number): void;
        setScale(scale: vmath.vec3): void;
        setScale(x: number, y: number, z: number): void;
    }

    export class ModelComponent extends Component {
        _mesh: Mesh;
        _materials: (Material | null)[];
    }

    export class SkinningModelComponent extends ModelComponent {
        _skeleton: Skeleton;
        _skinningRoot: Node | null;
    }

    export class AnimationComponent extends Component {
        addClip(name: string, clip: any): void;
    }

    export class Asset {
        name: string;
    }

    export interface IBufferRange {
        offset: number;
        length: number;
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
    
    export const enum IndexUnit {
        /**
         * 8 bits unsigned integer.
         */
        UINT8,
    
        /**
         * 8 bits unsigned integer.
         */
        UINT16,
    
        /**
         * 8 bits unsigned integer.
         */
        UINT32,
    }
    
    export interface IVertexAttribute {
        /**
         * Attribute Name.
         */
        name: string;
    
        /**
         * Attribute base type.
         */
        baseType: AttributeBaseType;
    
        /**
         * Attribute type.
         */
        type: AttributeType;
    
        /**
         * Whether normalize.
         */
        normalize: boolean;
    }
    
    export interface IVertexBundle {
        /**
         * The data range of this bundle.
         * This range of data is essentially mapped to a GPU vertex buffer.
         */
        data: IBufferRange;
    
        /**
         * This bundle's vertices count.
         */
        verticesCount: number;
    
        /**
         * Attributes.
         */
        attributes: IVertexAttribute[];
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
        // @ts-ignore
        primitiveMode: GFXPrimitiveMode;
    
        indices?: {
            /**
             * The indices data range of this primitive.
             */
            range: IBufferRange;
    
            /**
             * The type of this primitive's indices.
             */
            indexUnit: IndexUnit;
        };
    
        /**
         * Geometric info for raycast purposes.
         */
        geometricInfo?: {
            doubleSided?: boolean;
            range: IBufferRange;
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

    export class Mesh extends Asset {
        data: ArrayBuffer | SharedArrayBuffer;
        _setRawAsset(x: string): void;
        assign(struct: IMeshStruct, data: ArrayBuffer | SharedArrayBuffer): void;
    }

    export class EffectAsset extends Asset {

    }

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

    export enum AnimationTargetProperty {
        position,
        rotation,
        scale,
    }

    export interface IPropertyAnimation {
        /**
         * Target Property to animate.
         */
        property: AnimationTargetProperty;
    
        /**
         * Index of keys into animation's keysList property;
         */
        indexOfKeys: number;
    
        /**
         * Property values.
         */
        values: number[];
    }

    export interface IAnimationChannel {
        /**
         * Target node's path in scene graph.
         */
        target: string;
    
        /**
         * Properties animation.
         */
        propertyAnimations: IPropertyAnimation[];
    }

    export class AnimationClip extends Asset {
        _channels: IAnimationChannel[];
        _keysList: number[][];
        _length: number;
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
}