'use strict';

const ipc = require('@base/electron-base-ipc');
const packageManager = require('@editor/package');
const panelManager = require('@editor/panel');

/**
 * 发送消息到主进程以及渲染进程
 * @param {*} message
 * @param {*} args
 */
let sendToAll = function(message, ...args) {
    if (typeof message !== 'string') {
        console.warn(`The first argument to sendToAll must be the message name.`);
        return;
    }

    packageManager.broadcast(message, ...args);
    panelManager.broadcast(message, ...args);
    ipc.broadcast(message, ...args);
};

/**
 * 发送消息到主进程内所有的 package
 * @param {*} message
 * @param {*} args
 */
let sendToAllPackages = function(message, ...args) {
    if (typeof message !== 'string') {
        console.warn(`The first argument to sendToAllPackages must be the message name.`);
        return;
    }
    packageManager.broadcast(message, ...args);
};

/**
 * 发送消息到所有窗口
 * @param {*} message
 * @param {*} args
 */
let sendToAllPanels = function(message, ...args) {
    if (typeof message !== 'string') {
        console.warn(`The first argument to sendToAllPanels must be the message name.`);
        return;
    }
    panelManager.broadcast(message, ...args);
};

/**
 * 发送消息给某个 panel
 * @param {*} panelID
 * @param {*} message
 * @param {*} args
 */
let sendToPanel = function(panelID, message, ...args) {
    if (typeof panelID !== 'string') {
        console.warn(`The first argument to sendToPanel must be the panel id.`);
        return;
    }
    if (typeof message !== 'string') {
        console.warn(`The second parameter of sendToPanel must be the message name.`);
        return;
    }
    panelManager.send(panelID, message, ...args);
};

/**
 * 发送消息给某个插件
 * @param {*} packageID
 * @param {*} message
 * @param {*} args
 */
let sendToPackage = function(packageID, message, ...args) {
    if (typeof packageID !== 'string') {
        console.warn(`The first argument to sendToPackage must be the package id.`);
        return;
    }
    if (typeof message !== 'string') {
        console.warn(`The second parameter of sendToPackage must be the message name.`);
        return;
    }
    packageManager.send(packageID, message, ...args);
};

/**
 * 发送消息给某个 package，并等待返回
 * @param {*} packageID
 * @param {*} message
 * @param {*} args
 * @return {Promise}
 */
let requestToPackage = function(packageID, message, ...args) {
    if (typeof packageID !== 'string') {
        console.warn(`The first argument to requestToPackage must be the package id.`);
        return;
    }
    if (typeof message !== 'string') {
        console.warn(`The second parameter of requestToPackage must be the message name.`);
        return;
    }
    return new Promise((resolve, reject) => {
        packageManager
            .send(packageID, message, ...args)
            .callback((error, data) => {
                if (error) {
                    return reject(error);
                }
                return resolve(data);
            });
    });
};

/**
 * 发送消息给某个 panel，并等待返回
 * @param {*} panelID
 * @param {*} message
 * @param {*} args
 * @return {Promise}
 */
let requestToPanel = function(panelID, message, ...args) {
    if (typeof panelID !== 'string') {
        console.warn(`The first argument to requestToPanel must be the panel id.`);
        return;
    }
    if (typeof message !== 'string') {
        console.warn(`The second parameter of requestToPanel must be the message name.`);
        return;
    }
    return new Promise((resolve, reject) => {
        panelManager
            .send(panelID, message, ...args)
            .callback((error, data) => {
                if (error) {
                    return reject(error);
                }
                return resolve(data);
            });
    });
};

if (ipc.broadcast) {
    ipc.on('editor-lib-ipc:call', (event, methods, message, ...args) => {
        module.exports[methods](message, ...args);
    });
} else {
    sendToAll = function(message, ...args) {
        ipc.send('editor-lib-ipc:call', 'sendToAll', message, ...args);
    };
}

module.exports = {
    // 广播消息
    sendToAll,
    sendToAllPackages,
    sendToAllPanels,

    // 单播消息
    sendToPanel,
    sendToPackage,

    // 等待回复的单播消息
    requestToPackage,
    requestToPanel,
};
