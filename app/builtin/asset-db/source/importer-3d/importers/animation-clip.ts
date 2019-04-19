'use strict';

import { readJSONSync } from 'fs-extra';
import { basename } from 'path';
import { Asset, Importer } from '@editor/asset-db';

export default class AnimationImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'animation-clip';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.AnimationClip';
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
        
        try {
            const json = readJSONSync(asset.source);
            json._name = basename(asset.source, '.anim');
            await asset.saveToLibrary('.json', JSON.stringify(json, null, 2));
        } catch (error) {
            console.error(error);
            return false;
        }

        return true;
    }
}
