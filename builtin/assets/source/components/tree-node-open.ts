'use strict';

/**
 * 打开一个 asset
 * 根据文件的后缀处理
 */
exports['.scene'] = (asset: ItreeAsset) => {
    Editor.Ipc.sendToPackage('scene', 'open-scene', asset.uuid);
};

exports['.fire'] = async (asset: ItreeAsset) => {
    await Editor.Dialog.show({
        type: 'warning',
        buttons: [], // 只留一个 确定 按钮
        title: Editor.I18n.t('assets.operate.dialogWaining'),
        message: Editor.I18n.t('assets.deprecate.fire'),
    });

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
