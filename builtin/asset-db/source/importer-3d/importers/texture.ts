import { Asset, Importer, VirtualAsset } from 'asset-db';
import { applyTextureBaseAssetUserData,
    makeDefaultTextureBaseAssetUserData,
    TextureBaseAssetUserData } from './texture-base';

export interface Texture2DAssetUserData extends TextureBaseAssetUserData {
    imageSource?: string;
}

export function makeDefaultTexture2DAssetUserData(): Texture2DAssetUserData {
    return makeDefaultTextureBaseAssetUserData();
}

export default class TextureImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.3';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'texture';
    }

    get assetType() {
        return 'cc.Texture2D';
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
    public async import(asset: VirtualAsset) {
        let updated = false;

        if (!(await asset.existsInLibrary('.json'))) {
            if (Object.getOwnPropertyNames(asset.userData).length === 0) {
                Object.assign(asset.userData, makeDefaultTexture2DAssetUserData());
            }
            const userData = asset.userData as Texture2DAssetUserData;

            // @ts-ignore
            const texture = new cc.Texture2D();
            applyTextureBaseAssetUserData(userData, texture);
            const imageSource = userData.imageSource as string;
            if (imageSource) {
                asset.rely(imageSource);
                const imageUuid = this.assetDB!.pathToUuid(imageSource);
                if (imageUuid) {
                    // @ts-ignore
                    const image = Manager.serialize.asAsset(imageUuid);
                    texture._mipmaps = [image];
                }
            }
            // @ts-ignore
            await asset.saveToLibrary('.json', Manager.serialize(texture));

            updated = true;
        }

        return updated;
    }
}
