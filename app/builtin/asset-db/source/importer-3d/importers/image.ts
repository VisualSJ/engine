import { Asset, Importer, queryUrlFromPath } from '@editor/asset-db';
import { AssertionError } from 'assert';
import Jimp from 'jimp';
import { extname } from 'path';
import { makeDefaultSpriteFrameAssetUserDataFromImageUuid } from './sprite-frame';
import { makeDefaultTexture2DAssetUserDataFromImageUuid } from './texture';
import { makeDefaultTextureCubeAssetUserData, TextureCubeAssetUserData } from './erp-texture-cube';

type ImageImportType = 'raw' | 'texture' | 'normal map' | 'sprite-frame' | 'texture cube';

export default class ImageImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.10';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'image';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.ImageAsset';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        return !(await asset.isDirectory());
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
        const ext = extname(asset.source);

        // @ts-ignore
        const image = new cc.ImageAsset();
        image._setRawAsset(asset.extname);

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(image));

        let importType = asset.userData.type as (ImageImportType | undefined);
        if (importType === undefined) {
            importType = 'texture';
            asset.userData.type = importType;
        }

        const imageDatabaseUri = queryUrlFromPath(asset.source);
        if (!imageDatabaseUri) {
            throw new AssertionError({ message: `${asset.source} is not found in asset-db.` });
        }

        let flipVertical = false;
        if (asset.userData.flipVertical !== undefined) {
            flipVertical = asset.userData.flipVertical;
        }

        switch (importType) {
            case 'raw':
                delete asset.userData.redirect;
                break;
            case 'texture':
            case 'normal map':
                const texture2DSubAsset = await asset.createSubAsset(asset.basename, 'texture');
                asset.userData.redirect = texture2DSubAsset.uuid;
                texture2DSubAsset.assignUserData(makeDefaultTexture2DAssetUserDataFromImageUuid(asset.uuid));
                break;
            case 'texture cube':
                const textureCubeSubAsset = await asset.createSubAsset(asset.basename, 'erp-texture-cube');
                asset.userData.redirect = textureCubeSubAsset.uuid;
                textureCubeSubAsset.assignUserData(makeDefaultTextureCubeAssetUserData());
                (textureCubeSubAsset.userData as TextureCubeAssetUserData).imageDatabaseUri = imageDatabaseUri;
                break;
            case 'sprite-frame':
                // const sprite2DSubAsset = await asset.createSubAsset(asset.basename, 'texture');
                // sprite2DSubAsset.assignUserData(makeDefaultTexture2DAssetUserDataFromImageUuid(asset.uuid));
                const textureSpriteFrameSubAsset = await asset.createSubAsset(asset.basename, 'sprite-frame');
                asset.userData.redirect = textureSpriteFrameSubAsset.uuid;
                textureSpriteFrameSubAsset.assignUserData(makeDefaultSpriteFrameAssetUserDataFromImageUuid(asset.uuid, ''));
                break;
        }

        if (!flipVertical) {
            await asset.copyToLibrary(ext, asset.source);
        } else {
            const img = await Jimp.read(asset.source);
            img.flip(false, true);
            const buffer = await img.getBufferAsync(img.getMIME());
            await asset.saveToLibrary(ext, buffer);
        }

        return true;
    }
}
