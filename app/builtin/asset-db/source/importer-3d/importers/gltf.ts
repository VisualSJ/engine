import { Asset, Importer, queryPathFromUrl, queryUrlFromPath, queryUuidFromUrl, VirtualAsset } from '@editor/asset-db';
import { AssertionError } from 'assert';
import * as fs from 'fs-extra';
import gltfValidator, { Severity } from 'gltf-validator';
import * as path from 'path';
import { Animation, Image, Material, Mesh, Skin, Texture } from '../../../../../@types/asset-db/glTF';
import { makeDefaultTexture2DAssetUserData, Texture2DAssetUserData } from './texture';
import { GltfAssetFinderKind, GltfConverter,
    GltfSubAsset, IGltfAssetFinder, isDataUri, isFilesystemPath, NormalImportSetting, readGltf, TangentImportSetting } from './utils/gltf-converter';
import { convertTGA } from './utils/image-mics';

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
    assetFinder?: SerializedAssetFinder;

    imageLocations: IImageLoctions;

    // Meshe import settings
    normals: NormalImportSetting;

    // Tangent import settings;
    tangents: TangentImportSetting;

    // Material import settings
    dumpMaterials: boolean;
}

function makeDefaultGltfUserData(): IGltfUserData {
    return {
        imageLocations: {},
        normals: NormalImportSetting.optional,
        tangents: TangentImportSetting.optional,
        dumpMaterials: false,
    };
}

function loadAssetSync(uuid: string) {
    // @ts-ignore
    return Manager.serialize.asAsset(uuid);
}

export default class GltfImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.78';
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

        // Validate.
        const report = await gltfValidator.validateBytes(fs.readFileSync(gltfFilePath), {
            uri: gltfFilePath,
            ignoredIssues: [
            ],
            severityOverrides: {
                NON_RELATIVE_URI: Severity.Information,
                UNDECLARED_EXTENSION: Severity.Warning,
            },
        });

        // Remove specified errors.
        const ignoredMessages = report.issues.messages.filter((message) => {
            if (message.code === 'VALUE_NOT_IN_RANGE' &&
                /\/accessors\/\d+\/count/.test(message.pointer) &&
                message.message === 'Value 0 is out of range.') {
                return true;
            }
            return false;
        });
        for (const message of ignoredMessages) {
            switch (message.severity) {
                case Severity.Error:
                    --report.issues.numErrors;
                    break;
                case Severity.Warning:
                    --report.issues.numInfos;
                    break;
            }
            console.debug(`glTf-validator issue(from ${asset.source}) ${JSON.stringify(message)} is ignored.`);
            report.issues.messages.splice(report.issues.messages.indexOf(message), 1);
        }

        const strintfyMessages = (severity: number) => {
            return JSON.stringify(
                report.issues.messages.filter((message) => message.severity === severity),
                undefined, 2);
        };
        if (report.issues.numErrors !== 0) {
            console.error(
                `File ${asset.source} contains errors, ` +
                `this may cause problem unexpectly, ` +
                `please fix them: ` +
                `\n` +
                `${strintfyMessages(Severity.Error)}\n`);
            throw new Error(`Bad glTf format.`);
        } else if (report.issues.numWarnings !== 0) {
            console.warn(
                `File ${asset.source} contains warnings, ` +
                `the result may be not what you want, ` +
                `please fix them if possible: ` +
                `\n` +
                `${strintfyMessages(Severity.Warning)}\n`);
        } else if (report.issues.numHints !== 0 || report.issues.numInfos !== 0) {
            console.debug(
                `Logs from ${asset.source}:` +
                `\n` +
                `${strintfyMessages(Severity.Information)}\n`);
        }

        // Create.
        const { gltf, binaryBuffers } = await readGltf(gltfFilePath);
        return new GltfConverter(gltf, binaryBuffers, gltfFilePath);
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
        return await this._importSubAssets(asset);
    }

    protected async getGltfFilePath(asset: Asset) {
        return asset.source;
    }

    private async _importSubAssets(asset: Asset) {
        // Create the converter
        const gltfConverter = await GltfImporter.createGltfConverter(asset);

        // Fill the swap space for sub-assets' use
        await GltfImporter.fillGltfSwapSpace(asset, { gltfConverter });

        const gltfFileBaseName = asset.basename;

        const userData = Object.keys(asset.userData).length === 0 ?
            Object.assign(asset.userData, makeDefaultGltfUserData()) : asset.userData as IGltfUserData;
        if (!userData.imageLocations) {
            userData.imageLocations = {};
        }
        if (!Reflect.has(userData, 'normals')) {
            userData.normals = NormalImportSetting.optional;
        }
        if (!Reflect.has(userData, 'tangents')) {
            userData.tangents = TangentImportSetting.optional;
        }

        const gltfAssetFinder = new DefaultGltfAssetFinder(userData.assetFinder);

        const importGltfAssetArray = async (
            gltfSubAssets: Mesh[] | Animation[] | Skin[] | Material[] | Texture[],
            finderKind: MyFinderKind,
            importlet: Importlet,
            extension: string
            ) => {
            gltfAssetFinder.allocate(finderKind, gltfSubAssets.length);
            const assetNames = makeUniqueSubAssetNames(gltfFileBaseName, gltfSubAssets, finderKind, extension);
            for (let index = 0; index < gltfSubAssets.length; ++index) {
                const name = assetNames[index];
                const uuid = await importlet(gltfSubAssets[index], index, name);
                if (uuid) {
                    gltfAssetFinder.emplace(finderKind, index, uuid);
                }
            }
        };

        const useSubimporter = (importer: string, parentUserData?: any) => {
            return async (gltfSubAsset: Mesh | Animation | Skin | Material, index: number, name: string) => {
                const subAsset = await asset.createSubAsset(name, importer);
                if (parentUserData) {
                    parentUserData.redirect = subAsset.uuid;
                }
                subAsset.userData.gltfIndex = index;
                return subAsset.uuid;
            };
        };

        // 导入 glTF 网格。
        const gltfMeshArray = gltfConverter.gltf.meshes;
        if (gltfMeshArray) {
            await importGltfAssetArray(gltfMeshArray, 'meshes', useSubimporter('gltf-mesh'), '.mesh');
        }

        // 导入 glTF 动画。
        const gltfAnimationArray = gltfConverter.gltf.animations;
        if (gltfAnimationArray) {
            await importGltfAssetArray(gltfAnimationArray, 'animations', useSubimporter('gltf-animation'), '.animation');
        }

        // 导入 glTF 皮肤。
        const gltfSkinArray = gltfConverter.gltf.skins;
        if (gltfSkinArray) {
            await importGltfAssetArray(gltfSkinArray, 'skeletons', useSubimporter('gltf-skeleton'), '.skeleton');
        }

        // 导入 glTF 图像。
        const gltfImageArray = gltfConverter.gltf.images;
        if (gltfImageArray) {
            gltfAssetFinder.allocateImages(gltfImageArray.length);
            const imageNames = makeUniqueSubAssetNames(gltfFileBaseName, gltfImageArray, 'images', '.image');
            for (let index = 0; index < gltfImageArray.length; ++index) {
                const imageDetail = await this._importGltfImage(
                    asset, userData, gltfConverter, gltfImageArray[index], index, imageNames[index]);
                gltfAssetFinder.setImageDeteail(index, imageDetail);
            }
        }

        // 导入 glTF 贴图。
        const gltfTextureArray = gltfConverter.gltf.textures;
        if (gltfTextureArray) {
            const importlet = async (texture: Texture, index: number, name: string) => {
                return await this._importGltfTexture(asset, gltfAssetFinder, gltfConverter, texture, name);
            };
            await importGltfAssetArray(gltfTextureArray, 'textures', importlet, '.texture');
        }

        // 导入 glTF 材质。
        const gltfMaterialArray = gltfConverter.gltf.materials;
        if (gltfMaterialArray) {
            let importlet: Importlet | undefined;
            if (!userData.dumpMaterials) {
                importlet = useSubimporter('gltf-material');
            } else {
                importlet = async (material: Material, index: number, name: string) => {
                    return await this._dumpMaterial(asset, gltfAssetFinder, gltfConverter, index, name);
                };
            }
            await importGltfAssetArray(gltfMaterialArray, 'materials', importlet, userData.dumpMaterials ? '.mtl' : '.material');
        }

        // 导入 glTF 场景。
        const gltfSceneArray = gltfConverter.gltf.scenes;
        if (gltfSceneArray) {
            await importGltfAssetArray(gltfSceneArray, 'scenes', useSubimporter('gltf-scene', asset.userData), '.prefab');
        }

        // 保存 AssetFinder。
        userData.assetFinder = gltfAssetFinder.serialize();

        return true;
    }

    private async _importGltfImage(
        asset: Asset, userData: IGltfUserData,
        gltfConverter: GltfConverter, gltfImage: Image, index: number, name: string) {

        const createEmbededImageAsset = async () => {
            const subAsset = await asset.createSubAsset(name, 'gltf-embeded-image');
            subAsset.userData.gltfIndex = index;
            return {
                embeded: true,
                uuidOrDatabaseUri: subAsset.uuid,
            };
        };

        if (gltfImage.bufferView !== undefined) {
            return await createEmbededImageAsset();
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
            return null;
        }

        const imageUriInfo = gltfConverter.getImageUriInfo(imageUrl);
        let imageDatabaseUri: string | null = null;
        if (isFilesystemPath(imageUriInfo)) {
            imageDatabaseUri = queryUrlFromPath(imageUriInfo.fullPath);
        }

        if (imageDatabaseUri) {
            return {
                embeded: false,
                uuidOrDatabaseUri: imageDatabaseUri,
            };
        } else {
            return await createEmbededImageAsset();
        }
    }

    private async _importGltfTexture(
        asset: Asset, assetFinder: DefaultGltfAssetFinder,
        gltfConverter: GltfConverter, gltfTexture: Texture, name: string) {
        const subAsset = await asset.createSubAsset(name, 'texture');
        const textureUserdata = subAsset.userData as Texture2DAssetUserData;
        Object.assign(textureUserdata, makeDefaultTexture2DAssetUserData());
        gltfConverter.getTextureParameters(gltfTexture, textureUserdata);
        if (gltfTexture.source !== undefined) {
            const imageDetail = assetFinder.getImageDetail(gltfTexture.source);
            if (imageDetail) {
                const userData = subAsset.userData as Texture2DAssetUserData;
                userData.isUuid = imageDetail.embeded;
                userData.imageUuidOrDatabaseUri = imageDetail.uuidOrDatabaseUri;
                if (!imageDetail.embeded) {
                    const imagePath = queryPathFromUrl(userData.imageUuidOrDatabaseUri);
                    if (!imagePath) {
                        throw new AssertionError({
                            message: `${userData.imageUuidOrDatabaseUri} is not found in asset-db.`,
                        });
                    }
                    subAsset.depend(imagePath);
                }
            }
        }
        return subAsset.uuid;
    }

    private async _dumpMaterial(asset: Asset, assetFinder: DefaultGltfAssetFinder, gltfConverter: GltfConverter, index: number, name: string) {
        const baseFolder = path.join(path.dirname(asset.source), `Materials_${asset.basename}`);
        fs.ensureDirSync(baseFolder);
        const destFileName = name;
        const destFilePath = path.join(baseFolder, destFileName);
        if (!fs.existsSync(destFilePath)) {
            const material = createMaterial(index, gltfConverter, assetFinder);
            const serialized = Manager.serialize(material);
            fs.writeFileSync(destFilePath, serialized);
        }
        const url = queryUrlFromPath(destFilePath);
        if (url) {
            const uuid = queryUuidFromUrl(url);
            if (typeof uuid === 'string') {
                return uuid;
            }
        }
        asset.depend(destFilePath);
        return null;
    }
}

type Importlet = (asset: Mesh | Animation | Skin | Material, index: number, name: string) => Promise<string | null>;

function tryGetOriginalPath(image: Image, gltfConverter: GltfConverter): string | null {
    return image.uri || null;
}

/**
 * 为glTF子资源数组中的所有子资源生成在子资源数组中独一无二的名字，这个名字可用作EditorAsset的名称以及文件系统上的文件名。
 * @param gltfFileBaseName glTF文件名，不含扩展名部分。
 * @param assetsArray glTF子资源数组。
 * @param extension 附加的扩展名。该扩展名将作为后缀附加到结果名字上。
 * @param options.preferedFileBaseName 尽可能地使用glTF文件本身的名字而不是glTF子资源本身的名称来生成结果。
 */
function makeUniqueSubAssetNames(gltfFileBaseName: string, assetsArray: GltfSubAsset[], finderKind: MyFinderKind | 'images', extension: string) {
    const getBaseNameIfNoName = () => {
        switch (finderKind) {
        case 'animations':
            return `UnnamedAnimation`;
        case 'images':
            return `UnnamedImage`;
        case 'meshes':
            return `UnnamedMesh`;
        case 'materials':
            return `UnnamedMaterial`;
        case 'skeletons':
            return `UnnamedSkeleton`;
        case 'textures':
            return `UnnamedTexture`;
        default:
            return `Unnamed`;
        }
    };

    let names = assetsArray.map((asset) => {
        let unchecked: string | undefined;
        if (finderKind === 'scenes') {
            unchecked = gltfFileBaseName;
        } else if (typeof asset.name === 'string') {
            unchecked = asset.name;
        } else {
            unchecked = getBaseNameIfNoName();
        }
        return validateAssetName(unchecked);
    });

    if (!isDifferWithEachOther(names)) {
        let tail = '-';
        while (true) {
            if (names.every((name) => !name.endsWith(tail))) {
                break;
            }
            tail += '-';
        }
        names = names.map((name, index) => name + `${tail}${(index)}`);
    }

    return names.map((name) => name + extension);
}

function isDifferWithEachOther(values: string[]) {
    if (values.length >= 2) {
        const sorted = values.slice().sort();
        for (let i = 0; i < sorted.length - 1; ++i) {
            if (sorted[i] === sorted[i + 1]) {
                return false;
            }
        }
    }
    return true;
}

function validateAssetName(name: string) {
    return name.replace(/[ <>:'#\/\\|?*\x00-\x1F]/g, '-');
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

    console.debug(`Image` +
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
            console.debug(`Do fuzzy search in ${dir}.`);
            const result = fuzzySearchTexture(dir, baseName, searchExtensions);
            if (result) {
                console.debug(`Found ${result}, use it.`);
                return result;
            }
        }
        baseDir = path.dirname(baseDir);
    }

    console.debug(`Fuzzy search failed.`);
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

        const parentUserData = asset.parent.userData as IGltfUserData;

        // Create the mesh asset
        const mesh = gltfConverter.createMesh(asset.userData.gltfIndex as number, {
            // normals: NormalImportSetting.recalculate,
            normals: parentUserData.normals,
            // tangents: TangentImportSetting.recalculate,
            tangents: parentUserData.tangents,
        });
        mesh._setRawAsset('.bin');

        // Save the mesh asset into library
        await asset.saveToLibrary('.json', Manager.serialize(mesh));
        await asset.saveToLibrary('.bin', Buffer.from(mesh.data));

        return true;
    }
}

export class GltfAnimationImporter extends GltfSubAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.5';
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

        const imageAsset = new cc.ImageAsset();
        const image = gltfConverter.readImage(gltfImage);
        if (image) {
            let imageData = image.imageData;
            let extName = image.extName;
            if (extName.toLocaleLowerCase() === '.tga') {
                const converted = await convertTGA(imageData);
                if (converted instanceof Error || !converted) {
                    console.error(`Failed to convert tga image.`);
                    return false;
                }
                extName = converted.extName;
                imageData = converted.data;
            }
            imageAsset._setRawAsset(extName);
            await asset.saveToLibrary(extName, imageData);
        }

        await asset.saveToLibrary('.json', Manager.serialize(imageAsset));

        return true;
    }
}

export class GltfMaterialImporter extends GltfSubAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.10';
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

        const gltfUserData = asset.parent.userData as IGltfUserData;
        const material = createMaterial(
            asset.userData.gltfIndex as number,
            gltfConverter,
            new DefaultGltfAssetFinder(gltfUserData.assetFinder));

        await asset.saveToLibrary('.json', Manager.serialize(material));

        return true;
    }
}

export class GltfPrefabImporter extends GltfSubAssetImporter {
    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.4';
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

        const gltfUserData = asset.parent.userData as IGltfUserData;

        const sceneNode = gltfConverter.createScene(
            asset.userData.gltfIndex as number,
            new DefaultGltfAssetFinder(gltfUserData.assetFinder));
        if (gltfConverter.gltf.scenes!.length === 1) {
            const baseName = (asset.parent as Asset).basename;
            sceneNode.name = path.basename(baseName, path.extname(baseName));
        }

        const prefab = generatePrefab(sceneNode);

        await asset.saveToLibrary('.json', Manager.serialize(prefab));

        return true;
    }
}

function walkNode(node: cc.Node, fx: (node: cc.Node) => void) {
    fx(node);
    node.children.forEach((childNode: cc.Node) => walkNode(childNode, fx));
}

function visitObjTypeReferences(node: cc.Node, visitor: any) {
    const parseFireClass = (obj: any, klass?: any) => {
        klass = klass || obj.constructor;
        const props = klass.__values__;
        for (const key of props) {
            const value = obj[key];
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i++) {
                        if (cc.isValid(value)) {
                            visitor(value, '' + i, value[i]);
                        }
                    }
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

function getDumpableNode(node: cc.Node, quiet?: boolean) {
    // deep clone, since we dont want the given node changed by codes below
    // node = cc.instantiate(node);

    walkNode(node, (item) => {
        // strip other node or components references
        visitObjTypeReferences(item, (obj: any, key: any, val: any) => {
            let shouldStrip = false;
            let targetName;
            if (val instanceof cc.Component.EventHandler) {
                val = val.target;
            }
            if (val instanceof cc.Component) {
                val = val.node;
            }
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

function generatePrefab(node: cc.Node) {
    const prefab = new cc.Prefab();
    walkNode(node, (childNode) => {
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

function createMaterial(index: number, gltfConverter: GltfConverter, assetFinder: IGltfAssetFinder) {
    const material = gltfConverter.createMaterial(
        index, assetFinder, (effectName) => {
            const uuid = queryUuidFromUrl(effectName);
            return loadAssetSync(uuid);
        });
    return material;
}

interface IImageDetail {
    uuidOrDatabaseUri: string;
    embeded: boolean;
}

interface SerializedAssetFinder {
    meshes?: Array<string | null>;
    animations?: Array<string | null>;
    skeletons?: Array<string | null>;
    images?: Array<IImageDetail | null>;
    textures?: Array<string | null>;
    materials?: Array<string | null>;
    scenes?: Array<string | null>;
}

type MyFinderKind = GltfAssetFinderKind | 'scenes';

interface FinderDataMap {
    meshes: string;
    animations: string;
    skeletons: string;
    images: IImageDetail;
    textures: string;
    materials: string;
    scenes: string;
}

class DefaultGltfAssetFinder implements IGltfAssetFinder {
    constructor(private _assetDetails: SerializedAssetFinder = {}) {
    }

    public serialize() {
        return this._assetDetails;
    }

    public allocate(kind: MyFinderKind, size: number) {
        this._assetDetails[kind] = new Array(size).fill(null);
    }

    public emplace(kind: MyFinderKind, index: number, uuid: string) {
        this._assetDetails[kind]![index] = uuid;
    }

    public find<T extends cc.Asset>(kind: MyFinderKind, index: number): T | null {
        const uuids = this._assetDetails[kind];
        if (uuids === undefined) {
            return null;
        }
        const detail = uuids[index];
        if (detail === null) {
            return null;
        } else {
            return loadAssetSync(detail);
        }
    }

    public allocateImages(size: number) {
        this._assetDetails.images = new Array(size).fill(null);
    }

    public getImageDetail(index: number): IImageDetail | null {
        return this._assetDetails.images![index];
    }

    public setImageDeteail(index: number, detail: IImageDetail | null) {
        this._assetDetails.images![index] = detail;
    }
}
