'use stirct';

import { Asset, Importer } from '@editor/asset-db';
import { existsSync, readFile } from 'fs-extra';
import { basename, dirname, join } from 'path';

const fntParser = require('../../../static/utils/fnt-parser');

/**
 * 获取实际的纹理文件位置
 * @param name
 * @param path
 */
function getRealFntTexturePath(name: string, path: string) {
    // const isWin32Path = name.indexOf(':') !== -1;
    const textureBaseName = basename(name);

    // if (isWin32Path) {
    //     textureBaseName = Path.win32.basename(textureName);
    // }
    const texturePath = join(dirname(path), textureBaseName);

    if (!existsSync(texturePath)) {
        console.error('Parse Error: Unable to find file Texture, the path: ' + texturePath);
    }
    return texturePath;
}

export default class BitmapImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.1';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'bitmap-font';
    }

    get assetType() {
        return 'cc.BitmapFont';
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

            // 解析文字文件
            const fntData = await readFile(asset.source, 'utf8');
            let fntConfig;
            try {
                fntConfig = fntParser.parseFnt(fntData);
            } catch (error) {
                console.error(error);
                throw new Error(
                    `BitmapFont import failed: ${asset.uuid} file parsing failed`
                );
            }

            // 缓存 fnt 配置
            asset.userData._fntConfig = fntConfig;

            // 如果文字尺寸不存在的话，不需要导入
            if (!fntConfig.fontSize) {
                return updated;
            }

            asset.userData.fontSize = fntConfig.fontSize;

            // 标记依赖资源
            const texturePath = getRealFntTexturePath(fntConfig.atlasName, asset.source);
            asset.rely(texturePath);
            const isExis = this.assetDB!.pathToUuid(texturePath);
            if (!isExis) {
                return false;
            }

            // 挂载 textureUuid
            if (!asset.userData.textureUuid && this.assetDB) {
                asset.userData.textureUuid = this.assetDB.pathToUuid(texturePath);
            }

            // 如果依赖的资源已经导入完成了，则生成对应的数据，并且
            if (asset.userData.textureUuid && this.assetDB) {

                const textureAsset = this.assetDB.getAsset(asset.userData.textureUuid);
                if (textureAsset) {
                    const bitmap = this.createBitmapFnt(asset);

                    // @ts-ignore
                    bitmap.spriteFrame = Manager.serialize.asAsset(textureAsset.uuid + '@' + textureAsset.basename);
                    // @ts-ignore
                    asset.saveToLibrary('.json', Manager.serialize(bitmap));

                    updated = true;
                }
            }
        }

        return updated;
    }

    /**
     * 创建一个 Bitmap 实例对象
     * @param asset
     */
    private createBitmapFnt(asset: Asset) {
        // @ts-ignore
        const bitmap = new cc.BitmapFont();
        bitmap.name = basename(asset.source, asset.extname);

        bitmap.fontSize = asset.userData.fontSize;
        bitmap.fntConfig = asset.userData._fntConfig;

        return bitmap;
    }
}
