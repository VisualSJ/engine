'use stirct';

const map = {

    /**
     * 打开场景
     */
    scene(uuid) {
        Editor.Ipc.sendToPanel('scene', 'open-scene', uuid);
    },
};

/**
 * 打开一个资源
 */
exports.open = function(node) {
    const handler = map[node.type];
    if (handler) {
        handler(node.uuid);
    }
};
