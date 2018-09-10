'use stirct';

import { Asset, Importer, VirtualAsset } from 'asset-db';

export default class SpriteImporter extends Importer {
    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'sprite';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: VirtualAsset | Asset) {
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
    public async exec(asset: VirtualAsset | Asset) {
        // 如果没有生成 json 文件，则重新生成
        if (!(await asset.existsFile('.json'))) {
            await asset.saveFile(
                '.json',
                JSON.stringify({
                    type: 'sprite',
                    texture: asset.userData.textureUuid
                })
            );
            return true;
        }
        return false;
    }
}
