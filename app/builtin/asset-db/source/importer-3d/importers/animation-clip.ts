import { Asset, Importer } from '@editor/asset-db';

export default class AnimationImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'animation-clip';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.LegacyAnimationClip';
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
            await asset.copyToLibrary('.json', asset.source);
        } catch (error) {
            console.error(error);
            return false;
        }

        return true;
    }
}
