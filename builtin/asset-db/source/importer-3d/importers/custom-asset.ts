'use stirct';

import { Asset, Importer } from 'asset-db';
import { readFile } from 'fs-extra';

export default class CustomAssetImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'custom-asset';
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
        try {
            // 如果当前资源没有导入，则开始导入当前资源
            if (!(await asset.existsInLibrary('.json'))) {

                const json = JSON.parse(await readFile(asset.source, 'utf8'));

                // @ts-ignore
                asset.saveToLibrary('.json', Manager.serialize(json));

                updated = true;
            }

            return updated;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

}
