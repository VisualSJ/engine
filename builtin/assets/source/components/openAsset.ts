'use strict';

/**
 * 打开一个 asset
 * 根据文件的后缀处理
 */
exports.scene = (uuid: string) => {
    Editor.Ipc.sendToPackage('scene', 'open-scene', uuid);
};
