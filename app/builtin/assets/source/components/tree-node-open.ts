'use strict';
import { shell } from 'electron';
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

exports['.js'] = openFile;
exports['.ts'] = openFile;
exports['.coffee'] = openFile;
exports['.md'] = openFile;
exports['.json'] = openFile;

exports['.png'] = openFile;
exports['.apng'] = openFile;
exports['.jpg'] = openFile;
exports['.jpge'] = openFile;
exports['.gif'] = openFile;

function openFile(asset: ItreeAsset) {
    const openRule: any = {
        text: {
            cmd: '',
            types: [
                '.js',
                '.ts',
                '.coffee',
                '.md',
                '.json',
            ],
        },
        image: {
            cmd: '',
            types: [
                '.png',
                '.jpg',
                '.jpge',
                '.gif',
                '.apng',
            ],
        },
    };

    const rules = Object.keys(openRule);
    for (const rule of rules) {
        const {cmd, types} = openRule[rule];
        if (cmd !== '' && types.includes(asset.fileExt)) {
            return; // TODO 暂时没有自定义操作
        }
    }

    // 最后由系统程序尝试打开一次
    shell.openItem(asset.file);
}
