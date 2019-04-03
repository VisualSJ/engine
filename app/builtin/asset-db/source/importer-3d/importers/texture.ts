import { Asset, Importer, queryUuidFromUrl, VirtualAsset, queryPathFromUrl } from '@editor/asset-db';
import {
    applyTextureBaseAssetUserData,
    makeDefaultTextureBaseAssetUserData,
    TextureBaseAssetUserData
} from './texture-base';
// import { getImageData } from '.';

export interface Texture2DAssetUserData extends TextureBaseAssetUserData {
    isUuid?: boolean;
    imageUuidOrDatabaseUri?: string;
}

export function makeDefaultTexture2DAssetUserData(): Texture2DAssetUserData {
    return makeDefaultTextureBaseAssetUserData();
}

export function makeDefaultTexture2DAssetUserDataFromImagePath(path: string): Texture2DAssetUserData {
    return Object.assign(makeDefaultTextureBaseAssetUserData(), {
        isUuid: false,
        imageUuidOrDatabaseUri: path,
    });
}

export function makeDefaultTexture2DAssetUserDataFromImageUuid(uuid: string): Texture2DAssetUserData {
    return Object.assign(makeDefaultTextureBaseAssetUserData(), {
        isUuid: true,
        imageUuidOrDatabaseUri: uuid,
    });
}

export default class TextureImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.19';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'texture';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.Texture2D';
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
        if (Object.getOwnPropertyNames(asset.userData).length === 0) {
            asset.assignUserData(makeDefaultTexture2DAssetUserData(), true);
        }

        const userData = asset.userData as Texture2DAssetUserData;

        // @ts-ignore
        const texture = new cc.Texture2D();
        applyTextureBaseAssetUserData(userData, texture);
        const imageAsset = this._getImageAsset(asset);
        if (imageAsset) {
            texture._mipmaps = [imageAsset];
        }

        await asset.saveToLibrary('.json', Manager.serialize(texture));

        return true;
    }

    protected _getImageAsset(asset: VirtualAsset) {
        const userData = asset.userData as Texture2DAssetUserData;
        // Get image.
        const imageUuidOrDatabaseUri = userData.imageUuidOrDatabaseUri;
        if (!imageUuidOrDatabaseUri) {
            return null;
        } else {
            let imageUuid: string | null = null;
            if (userData.isUuid) {
                imageUuid = imageUuidOrDatabaseUri;
            } else {
                imageUuid = queryUuidFromUrl(imageUuidOrDatabaseUri);
                if (!imageUuid) {
                    console.error(`Cannot find image ${queryPathFromUrl(imageUuidOrDatabaseUri) || ''}.`);
                }
            }
            if (imageUuid !== null) {
                // @ts-ignore
                const image = Manager.serialize.asAsset(imageUuid);
                return image;
            }
        }
        return null;
    }
}
