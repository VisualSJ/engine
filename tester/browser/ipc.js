'use strict';

const ps = require('path');
const ipc = require('@base/electron-base-ipc');

let packageName = '';
let listener = {};

/**
 * 插件发出的 sendToAll 消息
 */
ipc.on('tester:sendToAll', (event, info) => {
    // 告诉 tester 发送了消息
    ipc.broadcast('tester:package-send', 'sendToAll', {
        from: info.info,
        message: info.message,
        params: info.params,
    });

    // 发送消息给所有插件
    if (listener && listener.package) {
        Object.keys(listener.package).forEach((packageID) => {
            let messages = listener.package[packageID];
            let handler = messages[info.message];
            handler && handler(event, ...info.params);
        });
    }

    // 发送消息给所有面板
    if (listener && listener.panel) {
        Object.keys(listener.panel).forEach((panelID) => {
            let messages = listener.panel[panelID];
            let handler = messages[info.message];
            handler && handler(event, ...info.params);
        });
    }
});

/**
 * 插件发出的 sendToAll 消息
 */
ipc.on('tester:sendToAllPackages', (event, info) => {
    // 告诉 tester 发送了消息
    ipc.broadcast('tester:package-send', 'sendToAllPackages', {
        from: info.info,
        message: info.message,
        params: info.params,
    });

    if (!listener || !listener.package) {
        return;
    }

    // 发送消息给所有插件
    Object.keys(listener.package).forEach((packageID) => {
        let messages = listener.package[packageID];
        let handler = messages[info.message];
        handler && handler(event, ...info.params);
    });
});

/**
 * 插件发出的 sendToAll 消息
 */
ipc.on('tester:sendToAllPanels', (event, info) => {
    // 告诉 tester 发送了消息
    ipc.broadcast('tester:package-send', 'sendToAllPanels', {
        from: info.info,
        message: info.message,
        params: info.params,
    });

    if (!listener || !listener.panel) {
        return;
    }

    // 发送消息给所有面板
    Object.keys(listener.panel).forEach((panelID) => {
        let messages = listener.panel[panelID];
        let handler = messages[info.message];
        handler && handler(event, ...info.params);
    });
});

/**
 * 插件发出的 sendToPackage 消息
 */
ipc.on('tester:sendToPackage', (event, info) => {
    // 告诉 tester 发送了消息
    ipc.broadcast('tester:package-send', 'sendToPackage', {
        from: info.info,
        packageID: info.packageID,
        message: info.message,
        params: info.params,
    });

    if (!listener || !listener.package || !listener.package[info.packageID]) {
        return event.reply(new Error(`没有监听插件 - ${info.packageID}`));
    }
    let packageMessages = listener.package[info.packageID];
    let handler = packageMessages[info.message];
    if (!handler) {
        return event.reply(new Error(`没有监听插件的消息 - ${info.packageID}:${info.message}`));
    }

    handler(event, ...info.params);
});

/**
 * 插件发出的 requiestToPanel 消息
 */
ipc.on('tester:sendToPanel', (event, info) => {
    // 告诉 tester 发送了消息
    ipc.broadcast('tester:package-send', 'sendToPanel', {
        from: info.info,
        panelID: info.panelID,
        message: info.message,
        params: info.params,
    });

    if (!listener || !listener.panel || !listener.panel[info.panelID]) {
        return event.reply(new Error(`没有监听面板 - ${info.panelID}`));
    }
    let messages = listener.panel[info.panelID];
    let handler = messages[info.message];
    if (!handler) {
        return event.reply(new Error(`没有监听插件的消息 - ${info.panelID}:${info.message}`));
    }

    handler(event, ...info.params);
});

/**
 * 插件发出的 requestToPackage 消息
 */
ipc.on('tester:requestToPackage', (event, info) => {
    // 告诉 tester 发送了消息
    ipc.broadcast('tester:package-send', 'requestToPackage', {
        from: info.info,
        packageID: info.packageID,
        message: info.message,
        params: info.params,
    });

    if (!listener || !listener.package || !listener.package[info.packageID]) {
        return event.reply(new Error(`没有监听插件 - ${info.packageID}`));
    }
    let packageMessages = listener.package[info.packageID];
    let handler = packageMessages[info.message];
    if (!handler) {
        return event.reply(new Error(`没有监听插件的消息 - ${info.packageID}:${info.message}`));
    }

    handler(event, ...info.params);
});

/**
 * 插件发出的 requiestToPanel 消息
 */
ipc.on('tester:requestToPanel', (event, info) => {
    // 告诉 tester 发送了消息
    ipc.broadcast('tester:package-send', 'requestToPanel', {
        from: info.info,
        panelID: info.panelID,
        message: info.message,
        params: info.params,
    });

    if (!listener || !listener.panel || !listener.panel[info.panelID]) {
        return event.reply(new Error(`没有监听面板 - ${info.panelID}`));
    }
    let messages = listener.panel[info.panelID];
    let handler = messages[info.message];
    if (!handler) {
        return event.reply(new Error(`没有监听插件的消息 - ${info.panelID}:${info.message}`));
    }

    handler(event, ...info.params);
});

/**
 * 加载对应的插件预制的消息
 * @param {*} name 
 */
exports.load = function (name) {
    try {
        listener = require(ps.join(__dirname, '../../builtin', name, 'test/listener'));
        packageName = name;
    } catch (error) {
        console.error(error);
        packageName = '';
        listener = {};
    }
};

///////////////////////////////
// 重写 Editor.Ipc 发送到指定位置

Editor.Ipc.sendToAll = function (message, ...args) {
    ipc.emit('tester:sendToAll', {
        from: 'package',
        message: message,
        params: args,
    });
};

Editor.Ipc.sendToAllPackages = function (message, ...args) {
    ipc.emit('tester:sendToAllPackages', {
        from: 'package',
        message: message,
        params: args,
    });
};

Editor.Ipc.sendToAllPanels = function (message, ...args) {
    ipc.emit('tester:sendToAllPanels', {
        from: 'package',
        message: message,
        params: args,
    });
};

Editor.Ipc.sendToPackage = function (packageID, message, ...args) {
    ipc.emit('tester:sendToPackage', {
        from: 'package',
        packageID,
        message: message,
        params: args,
    });
};

Editor.Ipc.sendToPanel = function (panelID, message, ...args) {
    ipc.emit('tester:sendToPanel', {
        from: 'package',
        panelID,
        message: message,
        params: args,
    });
};

Editor.Ipc.requestToPackage = function (packageID, message, ...args) {
    return new Promise((resolve, reject) => {
        ipc
            .emit('tester:requestToPackage', {
                from: 'package',
                packageID,
                message: message,
                params: args,
            })
            .callback((error, data) => {
                if (error) {
                    return reject(error);
                }
                resolve(data);
            });
    });
};

Editor.Ipc.requestToPanel = function (panelID, message, ...args) {
    return new Promise((resolve, reject) => {
        ipc
            .emit('tester:requestToPanel', {
                from: 'package',
                panelID,
                message: message,
                params: args,
            })
            .callback((error, data) => {
                if (error) {
                    return reject(error);
                }
                resolve(data);
            });
    });
};