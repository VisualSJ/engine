'use strict';

/**
 * 打开一个 asset
 * 根据文件的后缀处理
 */
exports.scene = (asset: ItreeAsset) => {
    Editor.Ipc.sendToPackage('scene', 'open-scene', asset.uuid);
};

exports.js = (asset: ItreeAsset) => {
    openLocalFile(asset.uuid);
};

exports.ts = (asset: ItreeAsset) => {
    openLocalFile(asset.uuid);
};

exports.json = (asset: ItreeAsset) => {
    openLocalFile(asset.uuid);
};

function openLocalFile(uuid: string) {
    // TODO
}
