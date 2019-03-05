'use stirct';

const ps = require('path');

exports.load = function() {
    // HACK: 每个窗口自己注册自己的 uuid 翻译方法
    Editor.UI.DragObject.setNameTranslator(async function(uuid) {
        let info;

        // 节点
        info = await Editor.Ipc.requestToPanel('scene', 'query-node', uuid);
        if (info) {
            return info.name.value;
        }

        // 组件
        info = await Editor.Ipc.requestToPanel('scene', 'query-component', uuid);
        if (info) {
            return info.value.name.value;
        }

        // 资源
        info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        if (info) {
            if (info.source) {
                return ps.basename(info.source);
            }
            const arr = uuid.split('@');
            return arr[arr.length - 1];
        }

        return uuid;
    });
};
