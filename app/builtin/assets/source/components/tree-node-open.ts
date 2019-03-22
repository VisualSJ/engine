'use strict';
/**
 * 打开一个 asset
 * 根据文件的后缀处理
 */

export async function openAsset(asset: ItreeAsset) {
    // 走配置规则
    await Editor.Ipc.requestToPackage('assets', 'open-asset', {
        ext: asset.fileExt,
        file: asset.file,
        uuid: asset.uuid,
    });
}
