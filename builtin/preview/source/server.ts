'use strict';
import fs from 'fs';
import { Server } from 'http';

const io = require('socket.io');

let browserReload: number | boolean = false;
let server: Server | null = null;
let ioServer: any = null;

/**
 * 开启预览服务监听对应端口
 * @param {Server} server
 * @param {number} port
 * @param {((err: Error | null, port?: number) => void)} callback
 */
function listen(server: Server, port: number, callback: (err: Error | null, port?: number) => void) {
    function onError(err: any) {
        server.removeListener('listening', onListening);
        if (err.code !== 'EADDRINUSE' && err.code !== 'EACCES') {
            return callback(err);
        }
        listen(server, ++port, callback);
    }

    function onListening() {
        server.removeListener('error', onError);
        callback(null, port);
    }
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
}

/**
 * 初始化 websocket
 * @param {Server} server
 */
function initSocket(server: Server) {
    ioServer = io(server);
    ioServer.on('connection', () => {
        console.log('connected');
    });
    ioServer.on('disconnect', () => {
        console.log('disconnected');
    });
}

module.exports = {
    previewPort: 7456,
    /**
     * 启动预览服务
     */
    start() {
        const path = require('path');
        const http = require('http');
        const express = require('express');
        const app = express();

        app.use(express.static(path.join(__dirname, '../../preview/source/static')));
        app.set('views', path.join(__dirname, '../../preview/source/static'));
        app.set('view engine', 'jade');

        // 获取引擎文件
        app.get('/engine.js', async (req: any, res: any) => {
            const type = Editor.Project.type;
            const result = await Editor.Ipc.requestToPackage('engine', 'query-info', type);

            fs.createReadStream(result.path, { encoding: 'utf8' }).pipe(res);
        });

        // 获取场景文件
        app.get('/current-scene.js', async (req: any, res: any) => {
            const uuid = await Editor.Ipc.requestToPackage('scene', 'query-current-scene');
            if (uuid) {
                const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
                const filePath = asset.files[0];

                fs.stat(filePath, (err, stat) => {
                    if (err) {
                        console.error(err);
                    }
                    res.writeHead(200, {
                        'Content-Type': 'text/javascript',
                        'Content-Length': stat.size
                    });
                });
                fs.createReadStream(asset.files[0], { encoding: 'utf8' }).pipe(res);
            } else {
                res.end();
            }
        });

        app.get('/', (req: any, res: any, next: any) => {
            res.render('index', { title: 'cocos 3d', tip_sceneIsEmpty: Editor.I18n.t('preview.scene_is_empty') });
        });
        // 创建服务
        server = http.createServer(app);
        if (server) {
            listen(server, this.previewPort, (err: any, port?: number) => {
                if (err) {
                    console.error(err);
                }
            });
            initSocket(server);
        }
    },
    /**
     * 通过 websocket 触发浏览器刷新
     */
    browserReload() {
        browserReload ||
            (browserReload = setTimeout(() => {
                ioServer.emit('browser:reload');
                if (typeof browserReload === 'number') {
                    clearTimeout(browserReload);
                }
                browserReload = false;
            }));
    },
    /**
     * 停止预览服务
     */
    stop() {
        server &&
            server.close(() => {
                console.info('shutdown server for preview');
                server = null;
            });
    }
};
