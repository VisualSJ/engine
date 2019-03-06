export interface IBufferRange {
    offset: number;
    length: number;
}

export enum AttributeBaseType {
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

export enum AttributeType {
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

export enum IndexUnit {
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
