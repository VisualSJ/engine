import { Asset, Importer } from 'asset-db';
import { extname } from 'path';
import { makeDefaultTexture2DAssetUserData, Texture2DAssetUserData } from './texture';
import { makeDefaultTextureCubeAssetUserData, TextureCubeAssetUserData } from './texture-cube';

type ImageImportType = 'raw' | 'texture' | 'normal map' | 'sprite-frame' | 'texture cube';

export default class ImageImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.2';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'image';
    }

    get assetType() {
        return 'cc.ImageAsset';
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

        const ext = extname(asset.source);

        if (!(await asset.existsInLibrary(ext))) {
            await asset.copyToLibrary(ext, asset.source);
            updated = true;
        }

        if (!(await asset.existsInLibrary('.json'))) {
            // @ts-ignore
            const image = new cc.ImageAsset();
            image._setRawAsset(asset.extname);
            // @ts-ignore
            await asset.saveToLibrary('.json', Manager.serialize(image));

            let importType = asset.userData.type as (ImageImportType | undefined);
            if (importType === undefined) {
                importType = 'raw';
                asset.userData.type = importType;
            }

            switch (importType) {
                case 'raw':
                    break;
                case 'texture':
                case 'normal map':
                    const texture2DSubAsset = await asset.createSubAsset('texture', 'texture');
                    Object.assign(texture2DSubAsset.userData, makeDefaultTexture2DAssetUserData());
                    (texture2DSubAsset.userData as Texture2DAssetUserData).imageSource = asset.source;
                    break;
                case 'texture cube':
                    const textureCubeSubAsset = await asset.createSubAsset('texture cube', 'texture-cube');
                    Object.assign(textureCubeSubAsset.userData, makeDefaultTextureCubeAssetUserData());
                    (textureCubeSubAsset.userData as TextureCubeAssetUserData).imageSource = asset.source;
                    break;
                case 'sprite-frame':
                    break;
            }

            updated = true;
        }

        return updated;
    }
}
