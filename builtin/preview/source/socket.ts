'use stirct';

const io = require('socket.io');
let app: any = null;
let reloadTimer: any = null;
let deviceNum: number = 0; // 连接客户端数量
const ipc = require('@base/electron-base-ipc');

/**
 * 启动 io 服务器
 * @param server http 服务器
 */
export function start(server: any) {
    app = io(server);
    app.on('connection', (socket: any) => {
        deviceNum = app.eio.clientsCount;
        Editor.Ipc.sendToAll('preview:device-num-change', deviceNum);
        socket.on('disconnect', () => {
            deviceNum = app.eio.clientsCount;
            Editor.Ipc.sendToAll('preview:device-num-change', deviceNum);
        });
    });
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
