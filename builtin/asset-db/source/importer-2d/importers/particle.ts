'use stirct';

import { Asset, Importer } from 'asset-db';
import { readFile } from 'fs-extra';
import { dirname, extname, join } from 'path';

const plist = require('plist');

export default class ParticleImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'particle';
    }

    /**
     * 判断是否允许使用当前的 importer 进行导入
     * @param asset
     */
    public async validate(asset: Asset) {
        const data = plist.parse(await readFile(asset.source, 'utf8'));
        return typeof data.maxParticles !== 'undefined';
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

            // 读取 plist 的配置信息
            const data = plist.parse(await readFile(asset.source, 'utf8'));

            // @ts-ignore
            const particle = this.createParticle(asset);

            // 如果 plist 内指定了 texture file，则找到这张图片
            if (data.textureFileName) {
                let textureFilePath = join(dirname(asset.source), data.textureFileName);
                if (!extname(data.textureFileName)) {
                    textureFilePath += '.png';
                }

                if (this.assetDB) {
                    // @ts-ignore
                    const textureUuid = this.assetDB.pathToUuid[textureFilePath];
                    asset.rely(textureFilePath);
                    if (textureUuid) {
                        // @ts-ignore
                        particle.texture = Manager.serialize.asAsset(textureUuid);
                    } else {
                        console.warn('Can not find texture %s specified in %s', textureFilePath, asset.source);
                    }
                }
            }

            // @ts-ignore
            asset.saveToLibrary('.json', Manager.serialize(particle));

            updated = true;
        }

        return updated;
    }

    private createParticle(asset: Asset) {
        // @ts-ignore
        const particle = new cc.ParticleAsset();
        particle.name = asset.basename;
        particle._setRawAsset(asset.extname);

        return particle;
    }
}
