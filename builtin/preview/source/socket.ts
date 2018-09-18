'use stirct';

const io = require('socket.io');

let app: any = null;
let reloadTimer: any = null;

/**
 * 启动 io 服务器
 * @param server http 服务器
 */
export function start(server: any) {
    app = io(server);
    app.on('connection', () => {
        console.log('connected');
    });
    app.on('disconnect', () => {
        console.log('disconnected');
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
