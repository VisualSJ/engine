import { Asset, Importer, queryPathFromUrl, queryUrlFromPath, queryUuidFromUrl, VirtualAsset } from '@editor/asset-db';
import { AssertionError } from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Animation, GlTf, Image, Material, Mesh, Skin } from '../../../../../@types/asset-db/glTF';
import { makeDefaultTexture2DAssetUserData, Texture2DAssetUserData } from './texture';
import { GltfConverter, GltfImageUriInfo, IGltfAssetTable,
    isDataUri, isFilesystemPath, readGltf } from './utils/gltf-converter';

// All sub-assets share the same gltf converter.
interface IGltfAssetSwapSpace {
    gltfConverter: GltfConverter;
}

interface IImageLocation {
    // 模型文件中该图片的路径信息。
    originalPath?: string | null;

    // 用户设置的图片路径，Database-url 形式。
    targetDatabaseUrl: string | null;
}

interface IImageLoctions {
    [x: string]: IImageLocation | undefined;
}

interface IGltfUserData {
    assetTable: IGltfAssetTable;

    imageLocations: IImageLoctions;
}

function loadAssetSync(uuid: string) {
    // @ts-ignore
    return Manager.serialize.asAsset(uuid);
}

export default class GltfImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.89';
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
        const { gltf, binaryBuffers } = await readGltf(gltfFilePath);
        return new GltfConverter(gltf, binaryBuffers, gltfFilePath, loadAssetSync);
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
        await asset.copyToLibrary(asset.extname, asset.source);
        await this._importSubAssets(asset);
        return true;
    }

    protected async getGltfFilePath(asset: Asset) {
        return asset.source;
    }

    private async _importSubAssets(asset: Asset) {
        // Create the converter
        const gltfConverter = await GltfImporter.createGltfConverter(asset);

        // Fill the swap space for sub-assets' use
        await GltfImporter.fillGltfSwapSpace(asset, { gltfConverter });

        const userData = asset.userData as IGltfUserData;
        if (!userData.assetTable) {
            userData.assetTable = {};
        }

        // 手动数据迁移，要记得有了迁移机制之后这里要删掉
        if (userData.imageLocations) {
            for (const key in userData.imageLocations) {
                if (key in userData.imageLocations) {
                    const value = userData.imageLocations[key];
                    if (typeof value === 'string' || value === null) {
                        const newValue: IImageLocation = {
                            targetDatabaseUrl: value,
                        };
                        userData.imageLocations[key] = newValue;
                    }
                }
            }
        }

        if (!userData.imageLocations) {
            userData.imageLocations = {};
        }

        const assetTable = userData.assetTable;

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
            importer: string,
            preferedName?: string,
            parentUserData?: any
        ): Promise<Array<string | null>> => {
            const result = new Array<string | null>(gltfSubAssets.length).fill(null);
            for (let index = 0; index < gltfSubAssets.length; ++index) {
                const gltfSubAsset = gltfSubAssets[index];
                const name = generateSubAssetName(
                    asset,
                    gltfSubAsset,
                    _uniqueIndex(index, gltfSubAssets.length),
                    extension, preferedName);
                const subAsset = await asset.createSubAsset(name, importer);
                if (parentUserData) {
                    parentUserData.redirect = subAsset.uuid;
                }
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

        // Import images
        if (gltfConverter.gltf.images) {
            assetTable.images = new Array(gltfConverter.gltf.images.length).fill(null);
            for (let index = 0; index < gltfConverter.gltf.images.length; ++index) {
                const gltfImage = gltfConverter.gltf.images[index];
                await this._importGltfImage(asset, userData, assetTable, gltfConverter, gltfImage, index);
            }
        }

        // Import textures
        if (gltfConverter.gltf.textures) {
            assetTable.textures = new Array(gltfConverter.gltf.textures.length).fill(null);
            for (let index = 0; index < gltfConverter.gltf.textures.length; ++index) {
                const gltfTexture = gltfConverter.gltf.textures[index];
                const name = generateSubAssetName(
                    asset,
                    gltfTexture,
                    _uniqueIndex(index, gltfConverter.gltf.textures.length),
                    '.texture');
                const subAsset = await asset.createSubAsset(name, 'texture');
                const textureUserdata = subAsset.userData as Texture2DAssetUserData;
                Object.assign(textureUserdata, makeDefaultTexture2DAssetUserData());
                gltfConverter.getTextureParameters(gltfTexture, textureUserdata);
                if (gltfTexture.source !== undefined) {
                    const image = assetTable.images![gltfTexture.source];
                    if (image) {
                        const userData = subAsset.userData as Texture2DAssetUserData;
                        userData.isUuid = image.embeded;
                        userData.imageUuidOrDatabaseUri = image.uuidOrDatabaseUri;
                        if (!image.embeded) {
                            const imagePath = queryPathFromUrl(userData.imageUuidOrDatabaseUri);
                            if (!imagePath) {
                                // @ts-ignore
                                throw new AssertionError({
                                    message: `${userData.imageUuidOrDatabaseUri} is not found in asset-db.`,
                                });
                            }
                            subAsset.rely(imagePath);
                        }
                    }
                }
                assetTable.textures[index] = subAsset.uuid;
            }
        }

        // Import materials
        if (gltfConverter.gltf.materials) {
            assetTable.materials = await createSubAssets(gltfConverter.gltf.materials, '.material', 'gltf-material');
        }

        // Import scenes
        if (gltfConverter.gltf.scenes) {
            await createSubAssets(
                gltfConverter.gltf.scenes,
                '.prefab',
                'gltf-scene',
                gltfConverter.gltf.scenes.length === 1 ? asset.basename : undefined,
                asset.userData
            );
        }
    }

    private async _importGltfImage(
        asset: Asset, userData: IGltfUserData, assetTable: IGltfAssetTable,
        gltfConverter: GltfConverter, gltfImage: Image, index: number) {

        const createEmbededImageAsset = async () => {
            const name = generateSubAssetName(
                asset,
                gltfImage,
                _uniqueIndex(index, gltfConverter.gltf.images!.length),
                '.image');

            const subAsset = await asset.createSubAsset(name, 'gltf-embeded-image');
            subAsset.userData.gltfIndex = index;
            assetTable.images![index] = {
                embeded: true,
                uuidOrDatabaseUri: subAsset.uuid,
            };
        };

        if (gltfImage.bufferView !== undefined) {
            await createEmbededImageAsset();
            return;
        }

        const imageUrl = getFinalImageUrl(gltfImage, userData, gltfConverter, asset.source);

        const imageOriginalName = gltfImage.name;
        if (imageOriginalName !== undefined && typeof (imageOriginalName) === 'string') {
            const imageLocation = userData.imageLocations[imageOriginalName];
            if (imageLocation === undefined || imageLocation.originalPath === undefined) {
                userData.imageLocations[imageOriginalName] =  {
                    originalPath: tryGetOriginalPath(gltfImage, gltfConverter),
                    targetDatabaseUrl: null,
                } as IImageLocation;
            }
        }

        if (imageUrl === null) {
            return;
        }

        const imageUriInfo = gltfConverter.getImageUriInfo(imageUrl);
        let imageDatabaseUri: string | null = null;
        if (isFilesystemPath(imageUriInfo)) {
            imageDatabaseUri = queryUrlFromPath(imageUriInfo.fullPath);
        }

        if (imageDatabaseUri) {
            assetTable.images![index] = {
                embeded: false,
                uuidOrDatabaseUri: imageDatabaseUri,
            };
        } else {
            await createEmbededImageAsset();
        }
    }
}

function tryGetOriginalPath(image: Image, gltfConverter: GltfConverter): string | null {
    return image.uri || null;
}

function _uniqueIndex(index: number, length: number) {
    return length === 1 ? -1 : index;
}

function generateSubAssetName(
    gltfAsset: Asset,
    subAsset: { name?: string },
    index: number,
    extension: string,
    preferedName?: string) {
    let name = preferedName || subAsset.name;
    if (!name) {
        if (index < 0) {
            name = gltfAsset.basename;
        } else {
            name = `${gltfAsset.basename}-${index}`;
        }
    }
    return validateAssetName(name) + extension;
}

function validateAssetName(name: string | undefined) {
    if (!name) {
        return undefined;
    } else {
        return name.replace(/[ <>:'#\/\\|?*\x00-\x1F]/g, '-');
    }
}

function getFinalImageUrl(
    gltfImage: Image, gltfUserData: IGltfUserData, gltfConverter: GltfConverter, assetPath: string) {
    let imageName: string | undefined;
    if (typeof gltfImage.name === 'string') {
        imageName = gltfImage.name;
    }

    // If remapping is applied, return the remapped path.
    if (imageName) {
        const remapLocation = gltfUserData.imageLocations[gltfImage.name];
        if (remapLocation && remapLocation.targetDatabaseUrl) {
            const targetPath = queryPathFromUrl(remapLocation.targetDatabaseUrl);
            if (targetPath) {
                return targetPath;
            } else {
                console.warn(`Images can only be remapped to project images.` +
                    ` ${remapLocation.targetDatabaseUrl} doesn't refer to a project image.`);
            }
        }
    }

    const rawUri = gltfImage.uri;
    let expectedUri: string | undefined;
    if (rawUri !== undefined) {
        if (isDataUri(rawUri)) {
            return null;
        }
        expectedUri = rawUri;
        if (!path.isAbsolute(rawUri)) {
            expectedUri = path.join(path.basename(assetPath), rawUri);
        }
    }

    if (expectedUri && fs.existsSync(expectedUri)) {
        return expectedUri;
    }

    // Try find texture.

    const targetName = rawUri || imageName;
    if (!targetName) {
        return null;
    }

    console.log(`Image` +
        `(Name: ${gltfImage.name}, Raw url: ${gltfImage.uri}, Expected url: ${expectedUri})` +
        ` is not found, fuzzy search starts.`);
    const extName = path.extname(targetName);
    const baseName = path.basename(targetName, extName);
    const searchExtensions = [
        extName.toLocaleLowerCase(),
        '.jpg',
        '.jpeg',
        '.png',
    ];
    const searchDirectories = [
        '.',
        'textures',
        'materials',
    ];

    const maxDepth = 2;
    const projectPath = toNormalizedAbsolute(Manager.AssetWorker.assets.options.target);
    const inProjectPath = (p: string) => {
        return p.startsWith(projectPath);
    };

    let baseDir = path.dirname(toNormalizedAbsolute(assetPath));
    for (let i = 0; i < maxDepth && inProjectPath(baseDir); ++i) {
        for (const searchDirectory of searchDirectories) {
            const dir = path.join(baseDir, searchDirectory);
            console.log(`Do fuzzy search in ${dir}.`);
            const result = fuzzySearchTexture(dir, baseName, searchExtensions);
            if (result) {
                console.log(`Found ${result}, use it.`);
                return result;
            }
        }
        baseDir = path.dirname(baseDir);
    }

    console.log(`Fuzzy search failed.`);
    return rawUri || null;
}

function toNormalizedAbsolute(p: string) {
    const np = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
    return path.normalize(np);
}

function fuzzySearchTexture(directory: string, targetBaseName: string, extensions: string[]) {
    if (!fs.existsSync(directory)) {
        return null;
    }
    const dirItems = fs.readdirSync(directory);
    for (const dirItem of dirItems) {
        const extName = path.extname(dirItem);
        const baseName = path.basename(dirItem, extName);
        if (baseName !== targetBaseName) {
            continue;
        }
        const fullName = path.join(directory, dirItem);
        const stat = fs.statSync(fullName);
        if (!stat.isFile()) {
            continue;
        }
        if (extensions.indexOf(extName.toLowerCase()) >= 0) {
            return fullName;
        }
    }
    return null;
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
        return '1.0.2';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf-mesh';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.Mesh';
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
        if (await asset.existsInLibrary('.json')) {
            return false;
        }

        // This could not happen
        if (!asset.parent) {
            return false;
        }

        // Fetch the gltf convert associated with parent (gltf)asset
        const gltfConverter = await this.fetchGltfConverter(asset.parent as Asset);

        // Create the mesh asset
        const mesh = gltfConverter.createMesh(asset.userData.gltfIndex as number);
        mesh._setRawAsset('.bin');

        // Save the mesh asset into library
        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(mesh));
        await asset.saveToLibrary('.bin', Buffer.from(mesh.data));

        return true;
    }
}

export class GltfAnimationImporter extends GltfSubAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf-animation';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.AnimationClip';
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
        if (await asset.existsInLibrary('.json')) {
            return false;
        }

        if (!asset.parent) {
            return false;
        }

        const gltfConverter = await this.fetchGltfConverter(asset.parent as Asset);

        const animationClip = gltfConverter.createAnimation(asset.userData.gltfIndex as number);

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

    // 引擎内对应的类型
    get assetType() {
        return 'cc.Skeleton';
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
        if (await asset.existsInLibrary('.json')) {
            return false;
        }

        if (!asset.parent) {
            return false;
        }

        const gltfConverter = await this.fetchGltfConverter(asset.parent as Asset);

        const skeleton = gltfConverter.createSkeleton(asset.userData.gltfIndex as number);

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(skeleton));

        return true;
    }
}

export class GltfImageImporter extends GltfSubAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf-embeded-image';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.ImageAsset';
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

        const imageIndex = asset.userData.gltfIndex;

        const gltfImage = gltfConverter.gltf.images![imageIndex];

        // @ts-ignore
        const imageAsset = new cc.ImageAsset();
        const image = gltfConverter.readImage(gltfImage);
        if (image) {
            imageAsset._setRawAsset(image.extName);
            await asset.saveToLibrary(image.extName, image.imageData);
        }

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(imageAsset));

        return true;
    }
}

export class GltfMaterialImporter extends GltfSubAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.5';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf-material';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.Material';
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
        if (await asset.existsInLibrary('.json')) {
            return false;
        }

        if (!asset.parent) {
            return false;
        }

        const gltfConverter = await this.fetchGltfConverter(asset.parent as Asset);

        const assetTable = asset.parent.userData.assetTable as IGltfAssetTable;
        const textureTable = !assetTable.textures ? [] :
            // @ts-ignore
            assetTable.textures.map((textureUUID) => loadAssetSync(textureUUID));

        // @ts-ignore
        const material = gltfConverter.createMaterial(
            asset.userData.gltfIndex as number, textureTable, (effectName) => {
                const uuid = queryUuidFromUrl(effectName);
                return loadAssetSync(uuid);
            });

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(material));

        return true;
    }
}

export class GltfPrefabImporter extends GltfSubAssetImporter {
    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.3';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'gltf-scene';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.Prefab';
    }

    public async import(asset: VirtualAsset) {
        if (await asset.existsInLibrary('.json')) {
            return false;
        }

        if (!asset.parent) {
            return false;
        }

        const gltfConverter = await this.fetchGltfConverter(asset.parent as Asset);

        const assetTable = asset.parent.userData.assetTable as IGltfAssetTable;

        // @ts-ignore
        const sceneNode = gltfConverter.createScene(asset.userData.gltfIndex as number, assetTable);

        if (sceneNode.name === 'RootScene' || sceneNode.name === 'RootNode') {
            const baseName = (asset.parent as Asset).basename;
            sceneNode.name = path.basename(baseName, '');
        }

        const prefab = generatePrefab(sceneNode);

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(prefab));

        return true;
    }
}

// @ts-ignore
function walkNode(node: cc.Node, fx: (node: cc.Node) => void) {
    fx(node);
    // @ts-ignore
    node.children.forEach((childNode: cc.Node) => walkNode(childNode, fx));
}

// @ts-ignore
function visitObjTypeReferences(node: cc.Node, visitor) {
    const parseFireClass = (obj: any, klass?: any) => {
        klass = klass || obj.constructor;
        const props = klass.__values__;
        for (const key of props) {
            const value = obj[key];
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i++) {
                        // @ts-ignore
                        if (cc.isValid(value)) {
                            visitor(value, '' + i, value[i]);
                        }
                    }
                    // @ts-ignore
                } else if (cc.isValid(value)) {
                    visitor(obj, key, value);
                }
            }
        }
    };

    for (const component of node._components) {
        parseFireClass(component);
    }
}

// @ts-ignore
function getDumpableNode(node: cc.Node, quiet?: boolean) {
    // deep clone, since we dont want the given node changed by codes below
    // @ts-ignore
    // node = cc.instantiate(node);

    walkNode(node, (item) => {
        // strip other node or components references
        visitObjTypeReferences(item, (obj: any, key: any, val: any) => {
            let shouldStrip = false;
            let targetName;
            // @ts-ignore
            if (val instanceof cc.Component.EventHandler) {
                val = val.target;
            }
            // @ts-ignore
            if (val instanceof cc.Component) {
                val = val.node;
            }
            // @ts-ignore
            if (val instanceof cc._BaseNode) {
                if (!val.isChildOf(node)) {
                    shouldStrip = true;
                    targetName = val.name;
                }
            }
            if (shouldStrip) {
                obj[key] = null;
                // @ts-ignore
                if (!CC_TEST && !quiet) {
                    console.error(
                        'Reference "%s" of "%s" to external scene object "%s" can not be saved in prefab asset.',
                        key, obj.name || node.name, targetName
                    );
                }
            }
        });

        // 清空 prefab 中的 uuid，这些 uuid 不会被用到，不应该保存到 prefab 资源中，以免每次保存资源都发生改变。
        item._id = '';
        for (const component of item._components) {
            component._id = '';
        }
    });

    node._prefab.sync = false;  // not syncable by default

    return node;
}

// @ts-ignore
function generatePrefab(node: cc.Node) {
    // @ts-ignore
    const prefab = new cc.Prefab();
    walkNode(node, (childNode) => {
        // @ts-ignore
        const info = new cc._PrefabInfo();
        info.asset = prefab;
        info.root = node;
        info.fileId = childNode.uuid; // todo fileID
        childNode._prefab = info;
    });

    const dump = getDumpableNode(node);
    prefab.data = dump;
    return prefab;
}
