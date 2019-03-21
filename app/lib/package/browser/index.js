'use strict';

// const setting = require('@editor/setting');

const { join, extname } = require('path');
const { parse } = require('url');
const { EventEmitter } = require('events');
const { app, protocol } = require('electron');
const { existsSync, readJsonSync, readdirSync, statSync, outputJSONSync } = require('fs-extra');
const ipc = require('@base/electron-base-ipc');
const packageManager = require('@editor/package');

// /**
//  * 注册调试依赖的文件
//  */
// packageManager.debugRely({
//     editor: __dirname + '/debug.js',
// });

class PackageManager extends EventEmitter {

    constructor() {
        super();
        this.path2info = {};
    }

    /**
     * 查询插件数组
     * 
     * options: {
     *   name: string
     *   debug: boolean
     *   path: string
     *   enable: boolean
     *   invalid: boolean
     * }
     * 
     * @param {*} options
     */
    getPackages(options) {
        options = options || {};
        const list = [];
        Object.keys(packageManager.path2pkg).forEach((path) => {
            const pkg = packageManager.path2pkg[path];
            if ('name' in options && options.name !== pkg.name) {
                return;
            }
            if ('debug' in options && options.debug !== pkg.debug) {
                return;
            }
            if ('path' in options && options.path !== pkg.path) {
                return;
            }
            if ('enable' in options && options.enable !== pkg.enable) {
                return;
            }
            if ('invalid' in options && options.invalid !== pkg.invalid) {
                return;
            }
            return {
                name: pkg.name,
                version: pkg.version,
                debug: pkg.debug,

                path,
                enable: pkg.enabled,
                invalid: pkg.invalid,

                info: pkg.options,
            };
        });
        return list;
    }

    /**
     * 扫描一个目录，并将目录内的所有插件注册到管理器
     * 返回路径数组
     * @param {*} dir
     */
    async registerDir(dir) {
        if (!existsSync(dir)) {
            return [];
        }

        const stat = statSync(dir);
        if (!stat.isDirectory()) {
            return [];
        }

        const list = readdirSync(dir);
        const paths = list.map(async (name) => {
            const path = join(dir, name);

            const stat = statSync(path);
            if (!stat.isDirectory() && extname(path) !== '.asar') {
                return null;
            }

            this.register(path);

            return path;
        });

        return paths.filter(Boolean);
    }

    async unregisterDir(dir) {

    }

    /**
     * 注册一个文件夹地址为一个插件
     * @param {string} path
     */
    async register(path) {
        await packageManager.register(path);
    }

    /**
     * 取消一个已经注册的地址
     * @param {string} path
     */
    async unregister(path) {
        await packageManager.unregister(path);
    }

    /**
     * 启用一个插件
     * @param {string} path
     */
    async enable(path) {
        await packageManager.enable(path);
    }

    /**
     * 禁用一个插件
     * @param {string} path
     */
    async disable(path) {
        await packageManager.disable(path);
    }
}

module.exports = new PackageManager();

////////////////
// 转发时间消息 //

// 注册 package 的时候输出日志
packageManager.on('register', (info) => {
    console.log(`[Package] ${info.name}@${info.version} load`);
    module.exports.emit('register', info);
});

// 反注册 package 的时候输出日志
packageManager.on('unregister', (info) => {
    console.log(`[Package] ${info.name}@${info.version} unload`);
    module.exports.emit('unregister', info);
});

// 开启插件
packageManager.on('enable', (info) => {
    module.exports.emit('enable', info);
});

// 关闭插件
packageManager.on('disable', (info) => {
    module.exports.emit('disable', info);
});

//////////////////
// package 功能 //

// 注册 packages 协议，暂时只需要指向内置插件目录
app.once('ready', () => {
    protocol.registerFileProtocol('packages', (request, callback) => {
        const uri = parse(request.url);
        const pkg = packageManager.find(uri.host);

        if (!pkg) {
            return callback({ path: '' });
        }

        callback({
            path: join(pkg._path.root, uri.pathname),
        });
    });
});

// 页面进程调用主进程的方法
ipc.on('editor3d-lib-package:call', (event, name, ...args) => {
    return module.exports[name](...args);
});
