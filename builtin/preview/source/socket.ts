'use stirct';

const io = require('socket.io');
let app: any = null;
let reloadTimer: any = null;
let deviceNum: number = 0; // 连接客户端数量
let errorCollect: any = [];

/**
 * 启动 io 服务器
 * @param server http 服务器
 */
export function start(server: any) {
    app = io(server);
    errorCollect = [];
    app.on('connection', (socket: any) => {
        deviceNum = app.eio.clientsCount;
        Editor.Ipc.sendToAll('preview:device-num-change', deviceNum);
        socket.on('disconnect', () => {
            deviceNum = app.eio.clientsCount;
            Editor.Ipc.sendToAll('preview:device-num-change', deviceNum);
        });

        socket.on('preview error', (error: any) => {
            errorCollect.push(error);
            console.error(error);
        });
    });
}

/**
 * 断开与客户端的连接
 */
export function disconnect() {
    app.disconnect();
    Editor.Ipc.sendToAll('preview:disconnect');
}

/**
 * 发送 reload 消息
 */
export function emitReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
        app.emit('browser:reload');
    }, 100);
}

export function getErrors() {
    return errorCollect;
}
