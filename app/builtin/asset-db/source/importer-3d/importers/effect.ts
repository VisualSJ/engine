import { Asset, Importer } from '@editor/asset-db';
import { readFileSync } from 'fs-extra';
import { basename, extname, join } from 'path';

const shdcLib = require('../../../static/shdc-lib');

export default class EffectImporter extends Importer {
    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.4';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'effect';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.EffectAsset';
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
        shdcLib.addChunksCache(join(__dirname, '../../../static/chunks'));
        let updated = false;
        try {
            const ext = extname(asset.source);
            const filename = basename(asset.source, ext);

            if (!(await asset.existsInLibrary('.json'))) {
                updated = false;
                const content = readFileSync(asset.source, {
                    encoding: 'utf-8',
                });
                const effect = shdcLib.buildEffect(filename, content);
                // @ts-ignore
                let result = new cc.EffectAsset();
                result = Object.assign(result, effect);
                await asset.saveToLibrary('.json', Manager.serialize(result));
                updated = true;
            }

            return updated;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}
