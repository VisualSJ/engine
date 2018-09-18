'use strict';

/**
 * 打开一个 asset
 * 需要根据后缀处理不同的响应
 */
export function openAsset(item: ItreeAsset) {
    // @ts-ignore
    if (['scene'].includes(item.fileext)) {
        Editor.Ipc.sendToPackage('scene', 'open-scene', item.uuid);
    }
}
