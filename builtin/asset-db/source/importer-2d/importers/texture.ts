'use stirct';

import { Asset, Importer } from '@editor/asset-db';
import { extname } from 'path';

export default class ImageImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'texture';
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

        // 如果当前资源没有导入，则开始导入当前资源
        if (!(await asset.existsInLibrary(ext))) {
            asset.userData.type = 'sprite';
            asset.userData.wrapMode = 'clamp';
            asset.userData.filterMode = 'bilinear';
            asset.userData.premultiplyAlpha = false;

            await asset.copyToLibrary(ext, asset.source);
            updated = true;
        }

        // 如果当前资源没有生成 texture，则开始生成 texture
        if (!(await asset.existsInLibrary('.json'))) {
            const texture = this.createTexture(asset);
            asset.saveToLibrary('.json', JSON.stringify({
                __type__: 'cc.Texture2D',
                content: this.serialize(texture),
            }, null, 2));

            updated = true;
        }

        // 如果 subAsset 没有生成，则重新生成
        if (
            !asset.meta.subMetas['sprite-frame'] ||
            asset.meta.subMetas['sprite-frame'].importer !== 'sprite-frame'
        ) {
            // 名字叫 sprite-frame，使用 sprite 导入器
            const subSprite = await asset.createSubAsset('sprite-frame', 'sprite-frame');
            if (subSprite) {
                // 将数据传递给 subAsset
                subSprite.userData.textureUuid = asset.uuid;
                await asset.save();
                updated = true;
            }
        }

        return updated;
    }

    private createTexture(asset: Asset) {

        // @ts-ignore
        const texture = new cc.Texture2D();
        // @ts-ignore
        const WrapMode = cc.Texture2D.WrapMode;
        // @ts-ignore
        const Filter = cc.Texture2D.Filter;

        switch (asset.userData.wrapMode) {
            case 'clamp':
                texture.setWrapMode(WrapMode.CLAMP_TO_EDGE, WrapMode.CLAMP_TO_EDGE);
                break;
            case 'repeat':
                texture.setWrapMode(WrapMode.REPEAT, WrapMode.REPEAT);
                break;
        }

        switch (asset.userData.filterMode) {
            case 'point':
                texture.setFilters(Filter.NEAREST, Filter.NEAREST);
                break;
            case 'bilinear':
            case 'trilinear':
                texture.setFilters(Filter.LINEAR, Filter.LINEAR);
                break;
        }
        texture.setPremultiplyAlpha(asset.userData.premultiplyAlpha);
        return texture;
    }

    private serialize(texture: any) {
        let extId = '';
        if (texture._native) {
            // @ts-ignore encode extname
            const ext = cc.path.extname(texture._native);
            if (ext) {
                // @ts-ignore
                extId = cc.Texture2D.extnames.indexOf(ext);
                // @ts-ignore
                if (extId < 0) {
                    extId = ext;
                }
            }
        }
        const asset = '' + (extId || 0) + ',' +
            texture._minFilter + ',' + texture._magFilter + ',' +
            texture._wrapS + ',' + texture._wrapT + ',' +
            (texture._premultiplyAlpha ? 1 : 0);
        return asset;
    }
}
