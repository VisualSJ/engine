import { Asset, Importer } from '@editor/asset-db';
import * as fs from 'fs-extra';

const context = new AudioContext();

export default class AudioImporter extends Importer {

    // 版本号如果变更，则会强制重新导入
    get version() {
        return '1.0.0';
    }

    // importer 的名字，用于指定 importer as 等
    get name() {
        return 'audio-clip';
    }

    // 引擎内对应的类型
    get assetType() {
        return 'cc.AudioClip';
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
            const buffer = await context.decodeAudioData(fs.readFileSync(asset.source).buffer);
            const audio = this.createAudio(asset, buffer);
            asset.saveToLibrary('.json', Manager.serialize(audio));
            updated = true;
        }

        return updated;
    }

    private createAudio(asset: Asset, buffer: AudioBuffer) {
        // @ts-ignore
        const audio = new cc.AudioClip();
        audio._loadMode = asset.userData.downloadMode;
        audio._duration = buffer.duration;

        audio.name = asset.basename;
        audio._setRawAsset(asset.extname);

        return audio;
    }
}
