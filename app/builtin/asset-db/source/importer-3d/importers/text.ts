'use stirct';

import { Asset, Importer } from '@editor/asset-db';
import { readFile } from 'fs-extra';
import { extname } from 'path';

export default class TextImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'text';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        if (await asset.isDirectory()) {
            return false;
        }
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
        // 如果当前资源没有导入，则开始导入当前资源
        if (!(await asset.existsInLibrary('.json'))) {

            const text = await readFile(asset.source, 'utf8');

            // @ts-ignore
            const jsonAsset = new cc.TextAsset();
            jsonAsset.name = asset.basename;
            jsonAsset.text = text;

            // @ts-ignore
            asset.saveToLibrary('.json', Manager.serialize(jsonAsset));

            updated = true;
        }

        return updated;
    }

}
