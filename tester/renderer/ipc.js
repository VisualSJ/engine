'use strict';

///////////////////////////////
// 重写 Editor.Ipc 发送到指定位置

Editor.Ipc.sendToAll = function (message, ...args) {
    ipc.send('tester:sendToAll', {
        from: 'panel',
        message: message,
        params: args,
    });
};

Editor.Ipc.sendToAllPackages = function (message, ...args) {
    ipc.send('tester:sendToAllPackages', {
        from: 'panel',
        message: message,
        params: args,
    });
};

Editor.Ipc.sendToAllPanels = function (message, ...args) {
    ipc.send('tester:sendToAllPanels', {
        from: 'panel',
        message: message,
        params: args,
    });
};

Editor.Ipc.sendToPackage = function (packageID, message, ...args) {
    ipc.send('tester:sendToPackage', {
        from: 'panel',
        packageID,
        message: message,
        params: args,
    });
};

Editor.Ipc.sendToPanel = function (panelID, message, ...args) {
    ipc.send('tester:sendToPanel', {
        from: 'panel',
        panelID,
        message: message,
        params: args,
    });
};

Editor.Ipc.requestToPackage = function (packageID, message, ...args) {
    return new Promise((resolve, reject) => {
        ipc
            .send('tester:requestToPackage', {
                from: 'panel',
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
            .send('tester:requestToPanel', {
                from: 'panel',
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