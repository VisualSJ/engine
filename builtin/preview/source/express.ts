'use stirct';

import { createReadStream, stat } from 'fs-extra';
import http from 'http';
import { join } from 'path';
import { start as startSocket } from './socket';
const express = require('express');

let app: any = null;
let server: any = null;
let port = 7456;
let enginPath: string = '';
/**
 * 获取当前的端口
 */
export function getPort() {
    return port;
}

/**
 * 启动 exporess 服务器
 */
export async function start() {
    app = express();
    app.use(express.static(join(__dirname, '../static/resources')));

    app.set('views', join(__dirname, '../static/views'));
    app.set('view engine', 'jade');

    // 获取引擎文件
    app.get('/engine.js', async (req: any, res: any) => {
        const type = Editor.Project.type;
        const result = await Editor.Ipc.requestToPackage('engine', 'query-info', type);
        createReadStream(result.path, { encoding: 'utf8' }).pipe(res);
    });

    // 获取引擎文件
    app.get('/engine/*', async (req: any, res: any) => {
        if (!enginPath) {
            const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
            enginPath = info.path;
        }
        createReadStream(join(enginPath, req.params[0]), { encoding: 'utf8' }).pipe(res);
        // res.sendFile(join(enginPath, req.params[0]));
    });

    // 获取项目对应类型的脚本文件
    app.get('/boot.js', async (req: any, res: any) => {
        const type = Editor.Project.type;
        createReadStream(join(__dirname, `./../static/resources/${type}/boot.js`), { encoding: 'utf8' }).pipe(res);
    });

    // 获取当前场景资源 json 与 uuid
    app.get('/current-scene', async (req: any, res: any) => {
        const uuid = await Editor.Ipc.requestToPackage('scene', 'query-current-scene');
        if (!uuid) {
            res.end();
            return;
        }

        const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        const filePath = asset.files[0];
        createReadStream(filePath, { encoding: 'utf8' }).pipe(res);
        const info: any = stat(filePath);
        // 设置（HACK）资源目录地址
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Length': info.size,
        });
        res.cookie('uuid', uuid);
    });

    // 根据资源路径加载对应资源
    app.get('/res/import/*', async (req: any, res: any) => {
        const path = join(Editor.App.project, '/library', req.params[0]); // 获取文件名路径
        res.sendFile(path);
    });

    // 渲染主页
    app.get('/', (req: any, res: any, next: any) => {
        res.render('index', { title: 'cocos 3d', tip_sceneIsEmpty: Editor.I18n.t('preview.scene_is_empty') });
    });

    server = http.createServer(app);

    // 检查端口是否被占用
    do {
        try {
            await new Promise((resolve, reject) => {
                const handler = {
                    error() {
                        port++;
                        server.removeListener('listening', handler.listener);
                        reject(`Port ${port - 1} is occupied`);
                    },
                    listener() {
                        server.removeListener('error', handler.error);
                        resolve();
                    },
                };
                server.once('error', handler.error);
                server.once('listening', handler.listener);
                server.listen(port);
            });
            break;
        } catch (error) {
            console.warn(error);
        }
    } while (true);

    // 启动 websocket 服务器
    startSocket(server);
    return server;
}

/**
 * 关闭 exporess 服务器
 */
export function stop() {
    if (!server) {
        return;
    }
    server.close(() => {
        console.info('shutdown server for preview');
    });
}
