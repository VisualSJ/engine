'use strict';

exports.messages = {

    /**
     * 闪烁某个物体
     * @param {*} type 物体类型（node | asset）
     * @param {*} uuid 物体的绝对 id
     */
    flashing(type, uuid) {
        Editor.Ipc.sendToAll('hightlighter:flashing', type, uuid);
    },
};
