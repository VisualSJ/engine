'use stirct';

import { Asset, Importer, VirtualAsset } from '@editor/asset-db';

export default class UnknownImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return '*';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.Asset';
    }

    /**
     * 实际导入流程
     * @param asset
     */
    public async import(asset: Asset | VirtualAsset) {
        return false;
    }
}
