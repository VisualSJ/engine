import { Asset, Importer, VirtualAsset } from 'asset-db';
import * as fs from 'fs';
import { readJson } from 'fs-extra';
import * as path from 'path';
import { Accessor, Animation, GlTf, Material, Mesh, Skin } from '../../../../../@types/asset-db/glTF';

// All sub-assets share the same gltf converter.
interface IGltfAssetSwapSpace {
    gltfConverter: GltfConverter;
}

interface IGltfAssetTable {
    meshes?: Array<string | null>;
    animations?: Array<string | null>;
    skeletons?: Array<string | null>;
    textures?: Array<string | null>;
    materials?: Array<string | null>;
}

export default class GltfImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf';
    }

    public static async fillGltfSwapSpace(asset: Asset, swapSpace: IGltfAssetSwapSpace) {
        (asset as any).swapSpace = swapSpace;
    }

    /**
     * Create a gltf converter of the specified gltf asset.
     * @param asset The gltf asset.
     */
    public static async createGltfConverter(asset: Asset) {
        const importer = asset._assetDB.name2importer[asset.meta.importer] as GltfImporter;
        if (!importer) {
            throw new Error(`Importer is not found for asset ${asset.source}`);
        }

        const gltfFilePath: string = await importer.getGltfFilePath(asset);

        const gltf = await readJson(gltfFilePath) as GlTf;
        let buffers: Buffer[] = [];
        if (gltf.buffers) {
            buffers = gltf.buffers.map((gltfBuffer) => {
                if (!gltfBuffer.uri) {
                    return new Buffer(0);
                }
                const bufferPath = path.resolve(path.dirname(gltfFilePath), gltfBuffer.uri);
                return fs.readFileSync(bufferPath);
            });
        }
        return new GltfConverter(gltf, buffers);
    }

    private static _validateAssetName(name: string | undefined) {
        if (!name) {
            return undefined;
        } else {
            return name.replace(/[<>:'\/\\|?*\x00-\x1F]/g, '-');
        }
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        return true;
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: Asset) {
        let updated = false;

        // 如果当前资源没有导入，则开始导入当前资源
        if (!(await asset.existsInLibrary('.json'))) {
            await asset.copyToLibrary('.json', asset.source);
            updated = true;
            await this._importSubAssets(asset);
        }

        return updated;
    }

    protected async getGltfFilePath(asset: Asset) {
        return asset.source;
    }

    private async _importSubAssets(asset: Asset) {
        // Create the converter
        const gltfConverter = await GltfImporter.createGltfConverter(asset);

        // Fill the swap space for sub-assets' use
        await GltfImporter.fillGltfSwapSpace(asset, { gltfConverter });

        const assetTable: IGltfAssetTable = {};
        asset.userData.assetTable = assetTable;

        /**
         *
         * @param gltfSubAssets Gltf assets to create
         * @param extension Extension of sub-asset
         * @param importer Importer used by sub-assets
         * @return Sub-asset uuids foreach gltf sub-asset.
         */
        const createSubAssets = async (
            gltfSubAssets: Mesh[] | Animation[] | Skin[] | Material[],
            extension: string,
            importer: string
        ): Promise<Array<string | null>> => {
            const result = new Array<string | null>(gltfSubAssets.length).fill(null);
            for (let index = 0; index < gltfSubAssets.length; ++index) {
                const gltfSubAsset = gltfSubAssets[index];
                const name = (GltfImporter._validateAssetName(gltfSubAsset.name) || `${asset.basename}-${index}`) +
                    extension;
                const subAsset = await asset.createSubAsset(name, importer);
                subAsset.userData.gltfIndex = index;
                result[index] = subAsset.uuid;
            }
            return result;
        };

        // Import meshes
        if (gltfConverter.gltf.meshes) {
            assetTable.meshes = await createSubAssets(gltfConverter.gltf.meshes, '.mesh', 'gltf-mesh');
        }

        // Import animations
        if (gltfConverter.gltf.animations) {
            assetTable.animations = await createSubAssets(
                gltfConverter.gltf.animations, '.animation', 'gltf-animation');
        }

        // Import skeletons
        if (gltfConverter.gltf.skins) {
            assetTable.skeletons = await createSubAssets(gltfConverter.gltf.skins, '.skeleton', 'gltf-skeleton');
        }

        // Import textures
        if (gltfConverter.gltf.textures) {
            assetTable.textures = new Array(gltfConverter.gltf.textures.length).fill(null);
            for (let index = 0; index < gltfConverter.gltf.textures.length; ++index) {
                const gltfTexture = gltfConverter.gltf.textures[index];
                const name = (GltfImporter._validateAssetName(gltfTexture.name) || `${asset.basename}-${index}`) +
                    '.texture';
                const subAsset = await asset.createSubAsset(name, 'texture');
                if (gltfTexture.source !== undefined) {
                    const gltfImage = gltfConverter.gltf.images![gltfTexture.source];
                    if (gltfImage.uri) {
                        subAsset.userData.imageSource = gltfImage.uri;
                    }
                }
                assetTable.textures[index] = subAsset.uuid;
            }
        }

        // Import materials
        if (gltfConverter.gltf.materials) {
            assetTable.materials = await createSubAssets(gltfConverter.gltf.materials, '.material', 'gltf-material');
        }
    }
}

/**
 * Give the capability to access the GltfConverter.
 */
class GltfSubAssetImporter extends Importer {

    protected async fetchGltfConverter(asset: Asset) {
        let swapSpace = (asset as any).swapSpace as IGltfAssetSwapSpace;
        if (!swapSpace) {
            swapSpace = { gltfConverter: await GltfImporter.createGltfConverter(asset) };
            await GltfImporter.fillGltfSwapSpace(asset, swapSpace);
        }
        return swapSpace.gltfConverter;
    }
}

export class GltfMeshImporter extends GltfSubAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf-mesh';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: VirtualAsset) {
        return true;
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: VirtualAsset) {
        // This could not happen
        if (!asset.parent) {
            return false;
        }

        // Fetch the gltf convert associated with parent (gltf)asset
        const gltfConverter = await this.fetchGltfConverter(asset.parent as Asset);

        // Create the mesh asset
        const mesh = gltfConverter.createMesh(gltfConverter.gltf.meshes![asset.userData.gltfIndex as number]);
        mesh.mesh._setRawAsset('.bin');

        // Save the mesh asset into library
        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(mesh.mesh));
        await asset.saveToLibrary('.bin', new Buffer(mesh.buffer));

        return true;
    }
}

export class GltfAnimationImporter extends GltfSubAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf-animation';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: VirtualAsset) {
        return true;
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: VirtualAsset) {
        if (!asset.parent) {
            return false;
        }

        const gltfConverter = await this.fetchGltfConverter(asset.parent as Asset);

        const animationClip = gltfConverter.createAnimation(gltfConverter.gltf.animations![asset.userData.gltfIndex as number]);

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(animationClip));

        return true;
    }
}

export class GltfSkeletonImporter extends GltfSubAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf-skeleton';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: VirtualAsset) {
        return true;
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: VirtualAsset) {
        if (!asset.parent) {
            return false;
        }

        const gltfConverter = await this.fetchGltfConverter(asset.parent as Asset);

        const skeleton = gltfConverter.createSkeleton(gltfConverter.gltf.skins![asset.userData.gltfIndex as number]);

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(skeleton));

        return true;
    }
}

export class GltfMaterialImporter extends GltfSubAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf-material';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: VirtualAsset) {
        return true;
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: VirtualAsset) {
        if (!asset.parent) {
            return false;
        }

        const gltfConverter = await this.fetchGltfConverter(asset.parent as Asset);

        const assetTable = asset.parent.userData.assetTable as IGltfAssetTable;
        // @ts-ignore
        const textureTable = !assetTable.textures ? [] : assetTable.textures.map((textureUUID) => Manager.serialize.asAsset(textureUUID));
        // @ts-ignore
        const material = gltfConverter.createMaterial(
            gltfConverter.gltf.materials![asset.userData.gltfIndex as number], textureTable);

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(material));

        return true;
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

class GltfConverter {
    private _nodePathTable: string[] | null = null;

    constructor(private _gltf: GlTf, private _buffers: Buffer[]) {
        this._nodePathTable = this._createNodePathTable();
    }

    get gltf() {
        return this._gltf;
    }

    public createMesh(gltfMesh: Mesh) {
        const bufferBlob = new BufferBlob();

        // @ts-ignore
        const minPosition = new cc.Vec3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        // @ts-ignore
        const maxPosition = new cc.Vec3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

        // @ts-ignore
        const vertexBundles = new Array<cc.VertexBundle>();
        const primitives = gltfMesh.primitives.map((gltfPrimitive, primitiveIndex) => {
            const attributeNames = Object.getOwnPropertyNames(gltfPrimitive.attributes);

            let vertexBufferStride = 0;
            let verticesCount = 0;
            const formats: Array<{ name: any, type: number, num: number }> = [];

            const attributeByteLengths = attributeNames.map((attributeName) => {
                const attributeAccessor = this._gltf.accessors![gltfPrimitive.attributes[attributeName]];
                const attributeByteLength = this._getBytesPerAttribute(attributeAccessor);
                vertexBufferStride += attributeByteLength;
                verticesCount = Math.max(verticesCount, attributeAccessor.count);
                return attributeByteLength;
            });

            const vertexBuffer = new ArrayBuffer(vertexBufferStride * verticesCount);

            let currentByteOffset = 0;
            attributeNames.forEach((attributeName, iAttribute) => {
                const attributeAccessor = this._gltf.accessors![gltfPrimitive.attributes[attributeName]];
                this._readAccessor(attributeAccessor, new DataView(vertexBuffer, currentByteOffset), vertexBufferStride);
                currentByteOffset += attributeByteLengths[iAttribute];

                if (attributeName === 'POSITION') {
                    if (attributeAccessor.min) {
                        // @ts-ignore
                        cc.vmath.vec3.min(minPosition, minPosition, new cc.vmath.vec3(attributeAccessor.min[0], attributeAccessor.min[1], attributeAccessor.min[2]));
                    }
                    if (attributeAccessor.max) {
                        // @ts-ignore
                        cc.vmath.vec3.max(maxPosition, maxPosition, new cc.vmath.vec3(attributeAccessor.max[0], attributeAccessor.max[1], attributeAccessor.max[2]));
                    }
                }

                formats.push({
                    name: this._getGfxAttributeName(attributeName),
                    type: this._getGfxComponentType(attributeAccessor.componentType),
                    num: this._getComponentsPerAttribute(attributeAccessor.type),
                });
            });

            // @ts-ignore
            const vertexBundleRange = new cc.BufferRange(bufferBlob.addBuffer(vertexBuffer), vertexBuffer.byteLength);

            // @ts-ignore
            const vertexBundle = new cc.VertexBundle();
            vertexBundle._data = vertexBundleRange;
            vertexBundle._verticesCount = verticesCount;
            vertexBundle._formats = formats;
            vertexBundles.push(vertexBundle);

            let indices = null;
            let indexUnit = null;
            if (gltfPrimitive.indices !== undefined) {
                const indicesAccessor = this._gltf.accessors![gltfPrimitive.indices];
                const indexStride = this._getBytesPerAttribute(indicesAccessor);
                const indicesData = new ArrayBuffer(indexStride * indicesAccessor.count);
                this._readAccessor(indicesAccessor, new DataView(indicesData));
                // @ts-ignore
                indices = new cc.BufferRange(bufferBlob.addBuffer(indicesData), indicesData.byteLength);
                indexUnit = this._getGfxIndexUnitType(indicesAccessor.componentType);
            }

            // @ts-ignore
            const primitive = new cc.Primitive();
            primitive._vertexBundelIndices = [primitiveIndex ];
            primitive._topology = this._getTopology(gltfPrimitive.mode === undefined ? 4 : gltfPrimitive.mode);
            primitive._indices = indices;
            primitive._indexUnit = indexUnit;
            return primitive;
        });

        // @ts-ignore
        const mesh = new cc.Mesh();
        mesh.name = gltfMesh.name;
        mesh._minPosition = minPosition;
        mesh._maxPosition = maxPosition;
        mesh._primitives = primitives;
        mesh._vertexBundles = vertexBundles;
        return { mesh, buffer: bufferBlob.getCombined() };
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
            if (inverseBindMatricesAccessor.componentType !== 5126 ||
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
        const frames: cc.AnimationFrame[] = [];
        let maxLength = 0;

        gltfAnimation.channels.forEach((gltfChannel) => {
            const targetNode = gltfChannel.target.node;

            if (targetNode === undefined) {
                // When node isn't defined, channel should be ignored.
                return;
            }

            const gltfSampler = gltfAnimation.samplers[gltfChannel.sampler];
            const inputAccessor = this._gltf.accessors![gltfSampler.input];

            // find frame by input name
            let frame = frames.find((frame) => frame._name === inputAccessor.name);

            // if not found, create one
            if (!frame) {
                if (inputAccessor.componentType !== 5126 ||
                    inputAccessor.type !== 'SCALAR') {
                    throw new Error(`Input of an animation channel must be floating point scalars represent times.`);
                }
                const inputData = new Float32Array(inputAccessor.count);
                this._readAccessor(inputAccessor, new DataView(inputData.buffer));

                const times = new Array(inputData.length);
                inputData.forEach((time, index) => {
                    times[index] = time;
                });
                if (times.length > 0) {
                    maxLength = Math.max(maxLength, times[times.length - 1]);
                }

                // @ts-ignore
                frame = new cc.AnimationFrame();
                frame._name = inputAccessor.name;
                frame._times = times;
                frame._channels = [];
                frames.push(frame);
            }

            // find output frames by node id
            let channel = frame._channels.find((channel: any) => channel.target === this._getNodePath(targetNode));

            // if not found, create one
            if (!channel) {
                // @ts-ignore
                channel = new cc.AnimationChannel();
                channel.target = this._getNodePath(targetNode);
                frame._channels.push(channel);
            }

            const outputAccessor = this._gltf.accessors![gltfSampler.output];
            if (outputAccessor.componentType !== 5126) {
                throw new Error(`Output of an animation channel must be floating point values.`);
            }
            const outputData = new Float32Array(this._getComponentsPerAttribute(outputAccessor.type) * outputAccessor.count);
            this._readAccessor(outputAccessor, new DataView(outputData.buffer));
            if (gltfChannel.target.path === 'translation') {
                if (outputAccessor.type !== 'VEC3') {
                    throw new Error(`Output of an animation channel targetting translation must be 3d vectors.`);
                }
                channel.positionCurve = new Array(outputAccessor.count);
                for (let i = 0; i < outputAccessor.count; ++i) {
                    // @ts-ignore
                    channel.positionCurve[i] = new cc.Vec3(outputData[3 * i + 0], outputData[3 * i + 1], outputData[3 * i + 2]);
                }
            } else if (gltfChannel.target.path === 'rotation') {
                if (outputAccessor.type !== 'VEC4') {
                    throw new Error(`Output of an animation channel targetting translation must be 4d vectors.`);
                }
                channel.rotationCurve = new Array(outputAccessor.count);
                for (let i = 0; i < outputAccessor.count; ++i) {
                    // @ts-ignore
                    channel.rotationCurve[i] = new cc.Quat(outputData[4 * i + 0], outputData[4 * i + 1], outputData[4 * i + 2], outputData[4 * i + 3]);
                }
            } else if (gltfChannel.target.path === 'scale') {
                if (outputAccessor.type !== 'VEC3') {
                    throw new Error(`Output of an animation channel targetting scale must be 3d vectors.`);
                }
                channel.scaleCurve = new Array(outputAccessor.count);
                for (let i = 0; i < outputAccessor.count; ++i) {
                    // @ts-ignore
                    channel.scaleCurve[i] = new cc.Vec3(outputData[3 * i + 0], outputData[3 * i + 1], outputData[3 * i + 2]);
                }
            } else {
                throw new Error(`Unsupported channel target path.`);
            }
        });

        // @ts-ignore
        const animationClip = new cc.AnimationClip();
        animationClip.name = gltfAnimation.name;
        animationClip._frames = frames;
        animationClip._length = maxLength;
        return animationClip;
    }

    // @ts-ignore
    public createMaterial(gltfMaterial: Material, textures: cc.Texture[]) {
        // @ts-ignore
        const material = new cc.Material();
        material.name = gltfMaterial.name;
        material.effectName = 'builtin-effect-unlit';
        if (gltfMaterial.pbrMetallicRoughness) {
            const pbrMetallicRoughness = gltfMaterial.pbrMetallicRoughness;
            if (pbrMetallicRoughness.baseColorTexture) {
                material.define('USE_TEXTURE', true);
                material.setProperty('mainTexture', textures[pbrMetallicRoughness.baseColorTexture.index]);
            } else {
                material.define('USE_COLOR', true);
                let color = null;
                if (pbrMetallicRoughness.baseColorFactor) {
                    const c = pbrMetallicRoughness.baseColorFactor;
                    // @ts-ignore
                    color = new cc.Color(c[0] * 255, c[1] * 255, c[2] * 255, c[3] * 255);
                } else {
                    // @ts-ignore
                    color = new cc.Color(255, 255, 255, 255);
                }
                material.setProperty('color', color);
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

    private _getTopology(mode: number) {
        // @ts-ignore
        const gfx = cc.gfx;
        switch (mode) {
            case 0: return gfx.PT_POINTS;
            case 1: return gfx.PT_LINES;
            case 2: return gfx.PT_LINE_LOOP;
            case 3: return gfx.PT_LINE_STRIP;
            case 4: return gfx.PT_TRIANGLES;
            case 5: return gfx.PT_TRIANGLE_STRIP;
            case 6: return gfx.PT_TRIANGLE_FAN;
            default:
                throw new Error(`Unrecognized primitive mode: ${mode}.`);
        }
    }

    private _getGfxIndexUnitType(componentType: number) {
        return componentType;
    }

    private _getGfxComponentType(componentType: number) {
        return componentType;
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
            case 5120: case 5121: return 1;
            case 5122: case 5123: return 2;
            case 5125: case 5126: return 4;
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

    private _getGfxAttributeName(name: string) {
        // @ts-ignore
        const gfx = cc.gfx;
        switch (name) {
            case 'POSITION': return gfx.ATTR_POSITION;
            case 'NORMAL': return gfx.ATTR_NORMAL;
            case 'TANGENT': return gfx.ATTR_TANGENT;
            case 'COLOR_0': return gfx.ATTR_COLOR0;
            case 'TEXCOORD_0': return gfx.ATTR_UV0;
            case 'TEXCOORD_1': return gfx.ATTR_UV1;
            case 'TEXCOORD_2': return gfx.ATTR_UV2;
            case 'TEXCOORD_3': return gfx.ATTR_UV3;
            case 'JOINTS_0': return gfx.ATTR_JOINTS;
            case 'WEIGHTS_0': return gfx.ATTR_WEIGHTS;
            default:
                throw new Error(`Unrecognized attribute type: ${name}`);
        }
    }

    private _getComponentReader(componentType: number): (buffer: DataView, offset: number) => number {
        switch (componentType) {
            case 5120: return (buffer, offset) => buffer.getInt8(offset);
            case 5121: return (buffer, offset) => buffer.getUint8(offset);
            case 5122: return (buffer, offset) => buffer.getInt16(offset, true);
            case 5123: return (buffer, offset) => buffer.getUint16(offset, true);
            case 5125: return (buffer, offset) => buffer.getUint32(offset, true);
            case 5126: return (buffer, offset) => buffer.getFloat32(offset, true);
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

    private _getComponentWriter(componentType: number): (buffer: DataView, offset: number, value: number) => void {
        switch (componentType) {
            case 5120: return (buffer, offset, value) => buffer.setInt8(offset, value);
            case 5121: return (buffer, offset, value) => buffer.setUint8(offset, value);
            case 5122: return (buffer, offset, value) => buffer.setInt16(offset, value, true);
            case 5123: return (buffer, offset, value) => buffer.setUint16(offset, value, true);
            case 5125: return (buffer, offset, value) => buffer.setUint32(offset, value, true);
            case 5126: return (buffer, offset, value) => buffer.setFloat32(offset, value, true);
            default:
                throw new Error(`Unrecognized component type: ${componentType}`);
        }
    }

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
