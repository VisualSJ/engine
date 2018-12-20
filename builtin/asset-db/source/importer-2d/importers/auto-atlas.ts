'use stirct';

import { Asset, Importer } from '@editor/asset-db';

export default class AutoAtlasImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'auto-atlas';
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

        // 如果当前资源没有导入，则开始导入当前资源
        if (!(await asset.existsInLibrary('.json'))) {

            asset.userData.maxWidth = 1024;
            asset.userData.maxHeight = 1024;
            asset.userData.padding = 2;
            asset.userData.allowRotation = true;
            asset.userData.forceSquared = false;
            asset.userData.powerOfTwo = true;
            asset.userData.heuristices = 'BestAreaFit';
            asset.userData.format = 'png';
            asset.userData.quality = 80;
            asset.userData.contourBleed = false;
            asset.userData.paddingBleed = false;
            asset.userData.filterUnused = false;

            const json = {
                // pac 文件实际上在编辑器下没用到，只有构建时会用。因此这里把类型设置为 cc.SpriteAtlas，方便构建时当成图集来处理。
                __type__: 'cc.SpriteAtlas',
            };

            // @ts-ignore
            Manager.serialize.setName(json, asset.basename);
            await asset.saveToLibrary('.json', JSON.stringify(json, null, 2));
            updated = true;
        }

        return updated;
    }
}
