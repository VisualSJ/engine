'use strict';

const ipc = require('@editor/ipc');

module.exports = {
    ///////////
    // 广播消息
    ///////////

    /**
     * 发送消息给所有的 package 和所有的 panel
     * @param {string} message 消息名称
     * @param {*} args 消息传递的参数
     */
    sendToAll(message, ...args) {
        return ipc.sendToAll(message, ...args);
    },

    /**
     * 发送消息给所有的 package
     * @param {string} message 消息名称
     * @param {*} args 消息传递的参数
     */
    sendToAllPackages(message, ...args) {
        return ipc.sendToAllPackages(message, ...args);
    },

    /**
     * 发送消息给所有的 panel
     * @param {string} message 消息名称
     * @param {*} args 消息传递的参数
     */
    sendToAllPanels(message, ...args) {
        return ipc.sendToAllPanels(message, ...args);
    },

    ///////////
    // 单播消息
    ///////////

    /**
     * 发送消息给指定的 panel
     * @param {string} panelID 面板名称
     * @param {string} message 消息名称
     * @param {*} args 消息传递的参数
     */
    sendToPanel(panelID, message, ...args) {
        return ipc.sendToPanel(panelID, message, ...args);
    },

    /**
     * 发送消息给指定的 package
     * @param {string} packageID 插件名称
     * @param {string} message 消息名称
     * @param {*} args 消息传递的参数
     */
    sendToPackage(packageID, message, ...args) {
        return ipc.sendToPackage(packageID, message, ...args);
    },

    ///////////////////
    // 等待回复的单播消息
    ///////////////////

    /**
     * 发送消息给指定的 panel，并等待对方回复
     * @param {string} panelID 面板名称
     * @param {string} message 消息名称
     * @param {*} args 消息传递的参数
     */
    requestToPanel(panelID, message, ...args) {
        return ipc.requestToPanel(panelID, message, ...args);
    },

    /**
     * 发送消息给指定的 package，并等待对方回复
     * @param {string} packageID 插件名称
     * @param {string} message 消息名称
     * @param {*} args 消息传递的参数
     */
    requestToPackage(packageID, message, ...args) {
        return ipc.requestToPackage(packageID, message, ...args);
    },
};
