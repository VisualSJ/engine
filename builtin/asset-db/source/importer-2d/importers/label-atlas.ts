'use stirct';

import { Asset, Importer } from 'asset-db';

const fntParser = require('../../../static/utils/fnt-parser');

interface ISize {
    width: number;
    height: number;
}

function createFntConfigString(
    spriteSize: ISize,
    itemSize: ISize,
    startChar: string,
    textureName: string,
    fontSize: number,
) {
    const startCharCode = startChar.charCodeAt(0);

    let result = `
        info face="Arial" size=${fontSize} \
        bold=0 italic=0 charset="" unicode=0 \
        stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spaceing=0,0\n\
        common lineHeight=${itemSize.height} base=${fontSize} \
        scaleW=${spriteSize.width} scaleH=${spriteSize.height} pages=1 packed=0\n\
        page id=0 file="${textureName}"\n
        chars count=0\n
    `;

    let totalChars = 0;
    for (let col = itemSize.height; col <= spriteSize.height; col += itemSize.height) {
      for (let row = 0; row < spriteSize.width && row + itemSize.width <= spriteSize.width; row += itemSize.width) {
        const charCode = startCharCode + totalChars;
        const x = row;
        const y = col - itemSize.height;
        const char = String.fromCharCode(charCode);

        result += `
            char id=${charCode} x=${x} y=${y} width=${itemSize.width} \
            height=${itemSize.height} xoffset=0 yoffset=0 xadvance=${itemSize.width} \
            page=0 chnl=0 letter="${char}"\n\
        `;

        ++totalChars;
      }
    }

    return result;
}

export default class LabelAtlasImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'label-atlas';
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
     * @param asset
     */
    public async import(asset: Asset) {
        let updated = false;

        // 如果导入资源不存在，则开始导入文件
        if (!await asset.existsInLibrary('.json')) {
            // 赋予默认值
            const userData = asset.userData;
            userData.itemWidth = userData.itemWidth || 0;
            userData.itemHeight = userData.itemHeight || 0;
            userData.startChar = userData.startChar || '';
            userData.rawTextureUuid = userData.rawTextureUuid || '';
            userData.fontSize = userData.fontSize || 0;

            // 生成实际资源
            const atlas = this.createAtlas(asset);

            // @ts-ignore 序列化
            asset.saveToLibrary('.json', Manager.serialize(atlas));

            updated = true;
        }

        return updated;
    }

    private createAtlas(asset: Asset) {
        // @ts-ignore
        const atlas = new cc.LabelAtlas();
        atlas.name = asset.basename;

        if (!this.assetDB) {
            return atlas;
        }

        const spriteUuid = asset.userData.rawTextureUuid + '@sprite-frame';
        const spriteAsset = this.assetDB.getAsset(spriteUuid);

        if (!spriteAsset) {
            return atlas;
        }

        // @ts-ignore
        atlas.spriteFrame = Manager.serialize.asAsset(spriteUuid);

        const userData = asset.userData;

        atlas.fontSize = userData.fontSize = userData.itemHeight * 0.88;

        if (
            userData.itemWidth > 0 &&
            userData.itemHeight > 0 &&
            userData.itemWidth <= spriteAsset.userData.rawWidth &&
            userData.itemHeight <= spriteAsset.userData.rawHeight
        ) {
            const fntString = createFntConfigString(
                { width: spriteAsset.userData.rawWidth, height: spriteAsset.userData.rawHeight},
                { width: userData.itemWidth, height: userData.itemHeight },
                userData.startChar,
                userData.textureName,
                userData.fontSize,
            );
            userData._fntConfig = fntParser.parseFnt(fntString);
        }

        return atlas;
    }
}
