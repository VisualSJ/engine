'use stirct';

import { createReadStream, existsSync } from 'fs-extra';
import http from 'http';
import { basename, join } from 'path';
import { disconnect , start as startSocket } from './socket';
const express = require('express');

const Mobiledetect = require('mobile-detect');
const { DEVICES } = require('./../../static/utils/config.js');
const { getConfig , getModules} = require('./util');

let app: any = null;
let server: any = null;
let port = 7456;
let enginPath: string = '';

let _buildMiddleware: any;
let script2library: any = {}; // 存储构建时传递过来的当前脚本索引 map

// 自定义错误类型
class ReqError extends Error {
    private code = 500;
    constructor(message: string, code: number) {
        super();
        this.message = message || 'Error';
        this.code = code;
    }
}

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
    app.use(express.static(join(__dirname, '../../static/resources'), {maxAge: 86400}));
    // TODO:预览稳定后，要更改缓存

    app.set('view engine', 'html');
    app.engine('.html', require('express-art-template'));
    app.set('views', join(__dirname, '../../static/views'));

    app.get('/setting.js', async (req: any, res: any, next: any) => {
        // 监听构建
        const data = await Editor.Ipc.requestToPackage('build', 'build-setting', {
            debug: true,
            type: 'preview', // 构建 setting 的种类
            platform: 'web-desktop',
            start_scene: getConfig('start_scene'),
            designWidth: getConfig('design_width'),
            designHeight: getConfig('design_height'),
        });
        if (!(data && data.content)) {
            next(new ReqError(`构建 settings 出错`, 500));
        }
        script2library = data.script2library;
        res.send(data.content);
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
    app.get('/preview-scripts/*', async (req: any, res: any, next: any) => {
        // 设置（HACK）资源目录地址
        res.writeHead(200, {
            'Content-Type': 'text/javascript',
        });
        const path = script2library[req.params[0]];
        if (!path) {
            next(new ReqError(`${req.params[0]} 脚本不存在`, 400));
        }
        const str = await getModules(req.params[0], path);
        if (!str) {
            next(new ReqError(`${req.params[0]} 脚本编译出错`, 500));
        }
        res.end(str);
    });

    // 获取当前场景资源 json 与 uuid
    app.get('/current-scene.json', async (req: any, res: any, next: any) => {
        const start_scene = getConfig('start_scene');
        const err = new ReqError(`无法查到当前场景 json 数据(start_scene) = ${start_scene}`, 500);
        if (start_scene === 'current_scene') {
            const json = await Editor.Ipc.requestToPanel('scene', 'query-scene-json');
            if (!json) {
                next(err);
            }
            res.end(json);
        } else if (start_scene) {
            const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', start_scene);
            if (asset && asset.library['.json']) {
                const filepath = asset.library['.json'];
                if (filepath) {
                    res.sendFile(filepath);
                } else {
                    next(err);
                }
            } else {
                next(err);
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
        const config = getConfig('', 'toolbarConfig');
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

    // 错误处理中间件
    app.use((err: any, req: any, res: any, next: any) => {
        console.error(err);
        res.status(err.code);
        res.format({
            html: () => {
                res.render('error', {
                    msg: err.message,
                });
            },
            json: () => {
                res.send({
                    error: err.message,
                });
            },
            text: () => {
                res.send(err.message);
            },
        });
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
