'use stirct';

import { copyFile, createReadStream, existsSync, readJSONSync } from 'fs-extra';
import http from 'http';
import { basename, join } from 'path';
import { disconnect , previewProfile , start as startSocket } from './socket';
const Mobiledetect = require('mobile-detect');
const { DEVICES } = require('./../static/utils/util');
const express = require('express');
const {URLSearchParams } = require('url');

let app: any = null;
let server: any = null;
let port = 7456;
let enginPath: string = '';

let _buildMiddleware: any;
// 默认的预览菜单栏设置
const previewConfig: any = {
    device: 'default',
    rotate: false,
    debugMode: 0,
    showFps: false,
    fps: 60,
};
/**
 * 获取当前的端口
 */
export function getPort() {
    return port;
}

/**
 * 设置构建的静态资源路径
 * @export
 * @param {string} path
 */
export function setPreviewBuildPath(path: string) {
    const express = require('express');
    _buildMiddleware = express.static(path);
}

/**
 * 启动 exporess 服务器
 */
export async function start() {
    app = express();
    app.use(express.static(join(__dirname, '../static/resources')));

    app.set('view engine', 'html');
    app.engine('.html', require('express-art-template'));
    app.set('views', join(__dirname, '../static/views'));
    app.get('/setting.js', async (req: any, res: any, next: any) => {
        let setting: any;
        setTimeout(() => {
            if (typeof(setting) !== 'string') {
                res.status(500).send('构建 settings 出错');
            }
        }, 5000);
        setting = await Editor.Ipc.requestToPackage('build', 'build-setting', {
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

    // 根据资源路径加载对应静态资源资源
    app.get('/res/import/*', async (req: any, res: any) => {
        let path = join(Editor.App.project, '/library', req.params[0]); // 获取文件名路径
        if (!existsSync(path)) {
            path = join(Editor.App.path, 'builtin/asset-db/static/internal/library', req.params[0]);
        }
        res.sendFile(path);
    });

    app.get('/res/raw-*', async (req: any, res: any) => {
        let path = join(Editor.App.project, req.params[0]); // 获取文件名路径
        if (!existsSync(path)) {
            path = join(Editor.App.path, 'builtin/asset-db/static/internal', req.params[0]);
        }
        res.sendFile(path);
    });

    // 渲染主页
    app.get('/', (req: any, res: any, next: any) => {
        const userAgent = req.header('user-agent');
        const md = new Mobiledetect(userAgent);
        const config = getPreviewConfig();
        res.render('index',
            {
                title: `Cocos ${Editor.Project.type} | ${basename(Editor.Project.path)}`,
                tip_sceneIsEmpty: Editor.I18n.t('preview.scene_is_empty'),
                enableDebugger: !!md.mobile() || (-1 !== userAgent.indexOf('MicroMessenger')),
                devices: DEVICES,
                config,
            });
    });

    // 依赖模块文件
    app.get('/node_modules/*', async (req: any, res: any) => {
        const path = join(Editor.App.path, '/node_modules', req.params[0]); // 获取文件名路径
        res.sendFile(path);
    });

    // ============================
    // Preview Build
    // ============================

    app.use('/build', (req: any, res: any, next: any) => {
        if (_buildMiddleware) {
            _buildMiddleware(req, res, next);
        } else {
            res.send('Please build your game project first!');
        }
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
                        Editor.Ipc.sendToAll('preview:port-change', port);
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
        disconnect();
        console.info('shutdown server for preview');
    });
}

/**
 * 获取当前预览菜单栏设置
 */
function getPreviewConfig() {
    const config: any = {};
    for (const key of Object.keys(previewConfig)) {
        config[key] = previewProfile.get(key) || previewConfig[key];
    }
    return config;
}
