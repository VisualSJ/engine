'use stirct';

import { Asset, Importer } from '@editor/asset-db';
import { extname } from 'path';

export default class TTFFontImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'ttf-font';
    }

    get assetType() {
        return 'cc.TTFFont';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        if (asset.extname === '.ts') {
            // 只允许 .d 结尾的文件（xxx.d.ts）
            return extname(asset.basename) === '.d';
        }
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

        const filename = asset.basename + '.ttf';
        // 如果当前资源没有导入，则开始导入当前资源
        if (!(await asset.existsInLibrary(filename))) {
            await asset.copyToLibrary(filename, asset.source);

            const ttf = this.createTTFFont(asset);

            // @ts-ignore
            asset.saveToLibrary('.json', Manager.serialize(ttf));

            updated = true;
        }

        return updated;
    }

    private createTTFFont(asset: Asset) {
        // @ts-ignore
        const ttf = new cc.TTFFont();
        ttf.name = asset.basename;
        ttf._setRawAsset(ttf.name + '.ttf');
        return ttf;
    }
}
