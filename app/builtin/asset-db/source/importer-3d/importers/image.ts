import { Asset, Importer, queryUrlFromPath } from '@editor/asset-db';
import { AssertionError } from 'assert';
import { readFileSync } from 'fs';
import Jimp from 'jimp';
import { makeDefaultTextureCubeAssetUserData, TextureCubeAssetUserData } from './erp-texture-cube';
import { makeDefaultSpriteFrameAssetUserDataFromImageUuid } from './sprite-frame';
import { makeDefaultTexture2DAssetUserDataFromImageUuid } from './texture';
import { convertTGA } from './utils/image-mics';

type ImageImportType = 'raw' | 'texture' | 'normal map' | 'sprite-frame' | 'texture cube';

export default class ImageImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.11';
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
     * @param asset
     */
    public async import(asset: Asset) {
        let extName = asset.extname;
        // If it's a string, is a path to the image file.
        // Else it's the image data buffer.
        let imageData: string | Buffer = asset.source;
        if (extName.toLocaleLowerCase() === '.tga') {
            const converted = await convertTGA(readFileSync(asset.source));
            if (!converted) {
                console.error(`Failed to convert tga image.`);
                return false;
            }
            extName = converted.extName;
            imageData = converted.data;
        }

        // Do flip if needed.
        const flipVertical = !!asset.userData.flipVertical;
        if (flipVertical) {
            if (typeof imageData === 'string') {
                imageData = readFileSync(asset.source);
            }
            const img = await Jimp.read(imageData);
            img.flip(false, true);
            imageData = await img.getBufferAsync(img.getMIME());
        }

        // Save the image data into library.
        if (typeof imageData === 'string') {
            await asset.copyToLibrary(extName, asset.source);
        } else {
            await asset.saveToLibrary(extName, imageData);
        }
        // Create the image asset.
        const image = new cc.ImageAsset();
        image._setRawAsset(extName);
        await asset.saveToLibrary('.json', Manager.serialize(image));

        const imageDatabaseUri = queryUrlFromPath(asset.source);
        if (!imageDatabaseUri) {
            throw new AssertionError({ message: `${asset.source} is not found in asset-db.` });
        }

        let importType = asset.userData.type as (ImageImportType | undefined);
        if (importType === undefined) {
            importType = 'texture';
            asset.userData.type = importType;
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

        return true;
    }
}
