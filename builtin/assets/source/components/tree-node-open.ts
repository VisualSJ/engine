'use strict';

/**
 * 打开一个 asset
 * 根据文件的后缀处理
 */
exports['.fire'] = (asset: ItreeAsset) => {
    Editor.Ipc.sendToPackage('scene', 'open-scene', asset.uuid);
};

exports['.js'] = (asset: ItreeAsset) => {
    openFile(asset.uuid);
};

exports['.ts'] = (asset: ItreeAsset) => {
    openFile(asset.uuid);
};

exports['.json'] = (asset: ItreeAsset) => {
    openFile(asset.uuid);
};

function openFile(uuid: string) {
    // TODO
}
