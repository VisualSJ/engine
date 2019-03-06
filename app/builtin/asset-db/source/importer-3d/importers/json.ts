'use stirct';

import { Asset, Importer } from '@editor/asset-db';
import { readJSON } from 'fs-extra';

export default class JsonImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'json';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.JsonAsset';
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

            const json = await readJSON(asset.source);

            // @ts-ignore
            const jsonAsset = new cc.JsonAsset();
            jsonAsset.name = asset.basename;
            jsonAsset.json = json;

            // @ts-ignore
            asset.saveToLibrary('.json', Manager.serialize(jsonAsset));

            updated = true;
        }

        return updated;
    }

}
