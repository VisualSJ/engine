'use stirct';

import { createReadStream, existsSync } from 'fs-extra';
import http from 'http';
import { join } from 'path';
import { start as startSocket } from './socket';
const { DEVICES} = require('./../static/utils/util');
const express = require('express');
const ipc = require('@base/electron-base-ipc');

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

    // 获取配置文件
    app.get('/setting.js', async (req: any, res: any) => {
        const setting = await Editor.Ipc.requestToPackage('build', 'build-setting', {
            debug: true,
            type: 'preview', // 构建 setting 的种类
            platform: 'web-desktop',
        });
        res.send(setting);
    });

    // 获取引擎基础文件
    app.get('/engine/*', async (req: any, res: any) => {
        if (!enginPath) {
            const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
            enginPath = info.path;
        }
        const str = req.params[0];
        createReadStream(join(enginPath, str), { encoding: 'utf8' }).pipe(res);
    });

    // 获取引擎文件
    app.get('/engine-dev/*', async (req: any, res: any) => {
        if (!enginPath) {
            const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
            enginPath = info.path;
        }
        const path = join(enginPath, 'bin/.cache/dev', req.params[0]);
        res.sendFile(path);
    }),

    // 获取项目对应类型的脚本文件
    app.get('/preview-scripts/*', async (req: any, res: any) => {
        // 设置（HACK）资源目录地址
        res.writeHead(200, {
            'Content-Type': 'text/javascript',
        });
        const str = await Editor.Ipc.requestToPackage('build', 'get-modules', req.params[0]);
        res.end(str);
    });

    // 获取当前场景资源 json 与 uuid
    app.get('/current-scene.json', async (req: any, res: any) => {
        const asset = await Editor.Ipc.requestToPackage('build', 'get-current-scene');
        if (asset.currenSceneFlag) {
            const json = await Editor.Ipc.requestToPanel('scene', 'query-scene-json');
            res.end(json);
        } else {
            const filepath = asset.library['.json'];

            if (filepath) {
                res.sendFile(filepath);
            }
        }

    });

    // 获取设备配置信息
    app.get('/get-devices', async (req: any, res: any) => {
        res.json(DEVICES);
    });

    // 根据资源路径加载对应静态资源资源
    app.get('/res/import/*', async (req: any, res: any) => {
        let path = join(Editor.App.project, '/library', req.params[0]); // 获取文件名路径
        if (!existsSync(path)) {
            path = join(Editor.App.path, 'builtin/asset-db/static/internal/library', req.params[0]);
        }
        res.sendFile(path);
    });
    app.get('/res/raw-*',  async (req: any, res: any) => {
        let path = join(Editor.App.project, '/library', req.params[0]); // 获取文件名路径
        if (!existsSync(path)) {
            path = join(Editor.App.path, 'builtin/asset-db/static/internal/library', req.params[0]);
        }
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
                        ipc.broadcast('package-preview:port-change', port);
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
