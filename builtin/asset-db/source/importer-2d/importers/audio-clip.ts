'use stirct';

import { Asset, Importer } from 'asset-db';

export default class AudioImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'audio-clip';
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
        if (!(await asset.existsInLibrary(asset.extname))) {
            // 0 - WEBAUDIO, 1 - DOM
            asset.userData.downloadMode = 0;

            await asset.copyToLibrary(asset.extname, asset.source);
            updated = true;
        }

        // 如果当前资源没有生成 audio，则开始生成 audio
        if (!(await asset.existsInLibrary('.json'))) {
            const audio = this.createAudio(asset);
            // @ts-ignore
            asset.saveToLibrary('.json', Manager.serialize(audio));
            updated = true;
        }

        return updated;
    }

    private createAudio(asset: Asset) {

        // @ts-ignore
        const audio = new cc.AudioClip();
        audio.loadMode = asset.userData.downloadMode;

        audio.name = asset.basename;
        audio._setRawAsset(asset.extname);

        return audio;
    }
}
