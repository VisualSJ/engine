'use strict';

const ipc = require('@editor/ipc');

module.exports = {
    // 广播消息
    sendToAll: ipc.sendToAll,
    sendToAllPackages: ipc.sendToAllPackages,
    sendToAllPanels: ipc.sendToAllPanels,

    // 单播消息
    sendToPanel: ipc.sendToPanel,
    sendToPackage: ipc.sendToPackage,

    // 等待回复的单播消息
    requestToPackage: ipc.requestToPackage,
    requestToPanel: ipc.requestToPanel,
};