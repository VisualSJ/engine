'use stirct';

import { Asset } from 'asset-db';
import CustomAssetImporter from './custom-asset';

export default class MaterialImporter extends CustomAssetImporter {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'material';
    }

    get assetType() {
        return 'cc.Material';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        return true;
    }

}
