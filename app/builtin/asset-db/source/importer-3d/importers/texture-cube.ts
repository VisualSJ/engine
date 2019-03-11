import { Asset, Importer, queryPathFromUrl, VirtualAsset } from '@editor/asset-db';

type FaceName = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

interface ITextureCubeUserData {
    // UUID of front side image.
    front: string;

    // UUID of back side image.
    back: string;

    // UUID of left side image.
    left: string;

    // UUID of right side image.
    right: string;

    // UUID of top side image.
    top: string;

    // UUID of bottom side image.
    bottom: string;
}

export default class TextureCubeImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'texture-cube';
    }

    get assetType() {
        return 'cc.TextureCube';
    }

    /**
     * 实际导入流程
     * 需要自己控制是否生成、拷贝文件
     *
     * 返回是否更新的 boolean
     * 如果返回 true，则会更新依赖这个资源的所有资源
     * @param asset
     */
    public async import(asset: VirtualAsset) {
        if (Object.keys(asset.userData).length === 0) {
            return false;
        }

        const userData = asset.userData as ITextureCubeUserData;

        const faceNames: FaceName[] = [
            'front', 'back', 'left', 'right', 'top', 'bottom',
        ];

        const faceAssets: { [faceName: string]: any; } = {};
        for (const faceName of faceNames) {
            if (faceName.length === 0) {
                return false;
            }
            const face = loadAssetSync(userData[faceName]);
            faceAssets[faceName] = face;
        }

        // @ts-ignore
        const texture = new cc.TextureCube();
        texture._mipmaps = [faceAssets];

        // @ts-ignore
        await asset.saveToLibrary('.json', Manager.serialize(texture));

        return true;
    }
}

function loadAssetSync(uuid: string) {
    // @ts-ignore
    return Manager.serialize.asAsset(uuid);
}
