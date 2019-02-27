'use strict';

// const setting = require('@editor/setting');

const { join, extname } = require('path');
const { parse } = require('url');
const { EventEmitter } = require('events');
const { app, protocol } = require('electron');
const { existsSync, readJsonSync, readdirSync, statSync, outputJSONSync } = require('fs-extra');
const ipc = require('@base/electron-base-ipc');
const packageManager = require('@editor/package');

const panel = require('../../panel');
const profile = require('../../profile');
const utils = require('./utils');

// /**
//  * 注册调试依赖的文件
//  */
// packageManager.debugRely({
//     editor: __dirname + '/debug.js',
// });

class PackageInfo {

    // path = '';
    // json = '';
    // info = {};
    // invalid = false;
    // enable = false;
    // autoEnable = false;

    constructor(path, profiles) {
        this.pkg = null;
        this.path = path || '';
        this.json = join(this.path, 'package.json');

        this.invalid = !existsSync(this.json);

        try {
            this.info = readJsonSync(this.json);
        } catch (error) {
            this.info = {};
            this.invalid = true;
        } finally {
            this.enable = false;
        }

        // 判断是否允许自动启动
        const globalDisable = profiles.global.get('disable') || [];
        const localDisable = profiles.local.get('disable') || [];
        const localEnable = profiles.local.get('enable') || [];

        // 如果在项目内设置了关闭，则直接不启动
        if (localDisable.includes(path)) {
            this.autoEnable = false;
            return;
        }

        // 如果全局关闭了，并且项目内没有单独打开，则直接不启动
        if (globalDisable.includes(path) && !localEnable.includes(path)) {
            this.autoEnable = false;
            return;
        }

        this.autoEnable = true;
        // await this.enable(path);
    }
}

class PackageManager extends EventEmitter {

    constructor() {
        super();
        this.path2info = {};

        this.profiles = {
            global: profile.load(`profile://global/lib/package.json`),
            local: profile.load(`profile://local/lib/package.json`),
        };
    }

    /**
     * 查询插件数组
     * @param {*} options
     */
    getPackages(options) {

        let paths = Object.keys(this.path2info);

        if (options && options.name) {
            paths = paths.filter((path) => {
                const pkgInfo = this.path2info[path];
                return pkgInfo.info.name === options.name;
            });
        }

        if (options && options.enable) {
            paths = paths.filter((path) => {
                const pkgInfo = this.path2info[path];
                return pkgInfo.enable === options.enable;
            });
        }

        if (options && options.autoEnable) {
            paths = paths.filter((path) => {
                const pkgInfo = this.path2info[path];
                return pkgInfo.autoEnable === options.autoEnable;
            });
        }

        return paths.map((path) => {
            return this.path2info[path];
        });
    }

    /**
     * 扫描一个目录，并将目录内的所有插件注册到管理器
     * 返回路径数组
     * @param {*} dir
     */
    scan(dir) {
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

    /**
     * 注册一个文件夹地址为一个插件
     * @param {string} path
     */
    register(path) {
        const info = new PackageInfo(path, this.profiles);
        this.path2info[path] = info;
        this.emit('register', path);
    }

    /**
     * 取消一个已经注册的地址
     * @param {string} path
     */
    unregister(path) {
        const info = this.path2info[path];

        // 插件不存在的情况下，直接跳过后续操作
        if (!info) {
            return;
        }

        if (info.enable) {
            this.disable(path);
        }

        delete this.path2info[path];

        this.emit('unregister', path);
    }

    /**
     * 启用一个插件
     * @param {string} path
     */
    async enable(path) {
        const info = this.path2info[path];

        // 插件不存在或者已经启动，直接跳过后续操作
        if (!info || info.enable) {
            return;
        }

        // 加载 package
        try {
            this.emit('before-enable', path, info);
            const pkg = await packageManager.register(path);
            info.pkg = pkg;
            info.enable = true;
            this.emit('enable', path, info);
            ipc.broadcast('editor3d-lib-package:emit', 'enable', path, info);

            // 在全局存储的数据内清除已经开启的插件
            const disableList = this.profiles.global.get('disable') || [];
            if (disableList.indexOf(path) !== -1) {
                const index = disableList.indexOf(path);
                disableList.splice(index, 1);
                this.profiles.global.set('disable', disableList);
                this.profiles.global.save();
            }
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * 在本地启用一个插件
     * @param {string} path
     */
    async localEnable(path) {
        const info = this.path2info[path];

        // 插件不存在或者已经启动，直接跳过后续操作
        if (!info || info.enable) {
            return;
        }

        // 加载 package
        try {
            const pkg = await packageManager.register(path);
            info.pkg = pkg;
            info.enable = true;
            this.emit('enable', path, info);
            ipc.broadcast('editor3d-lib-package:emit', 'enable', path, info);

            // 在本地存储的数据内清除已经开启的插件
            const disableList = this.profiles.local.get('disable') || [];
            const enableList = this.profiles.local.get('enable') || [];
            let updated = false;
            if (disableList.indexOf(path) !== -1) {
                const index = disableList.indexOf(path);
                disableList.splice(index, 1);
                this.profiles.local.set('disable', disableList);
                updated = true;
            }
            if (enableList.indexOf(path) === -1) {
                enableList.push(path);
                this.profiles.local.set('enable', enableList);
                updated = true;
            }
            if (updated) {
                this.profiles.local.save();
            }
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * 禁用一个插件
     * @param {string} path
     */
    async disable(path) {
        const info = this.path2info[path];

        // 插件不存在或者没有启动，直接跳过后续操作
        if (!info || !info.enable) {
            return;
        }

        // 卸载 package
        try {
            await packageManager.unregister(path);

            // 关闭 panel
            info.pkg.panels.forEach((name) => {
                name = name.replace('panel', info.pkg.name);
                panel.close(name);
            });

            // 移除 menu

            // 移除 main 对应的脚本缓存
            const main = join(info.path, info.pkg.getData('main'));
            utils.removeCache(main);

            info.enable = false;
            delete info.pkg;
            this.emit('disable', path, info);
            ipc.broadcast('editor3d-lib-package:emit', 'disable', path, info);

            // 在全局存储的数据内存入被关闭的插件
            const disableList = this.profiles.global.get('disable') || [];
            if (disableList.indexOf(path) === -1) {
                disableList.push(path);
                this.profiles.global.set('disable', disableList);
                this.profiles.global.save();
            }
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * 在本地启用一个插件
     * @param {string} path
     */
    async localDisable(path) {
        const info = this.path2info[path];

        // 插件不存在或者没有启动，直接跳过后续操作
        if (!info || !info.enable) {
            return;
        }

        // 卸载 package
        try {
            await packageManager.unregister(path);

            // 关闭 panel
            info.pkg.panels.forEach((name) => {
                name = name.replace('panel', info.pkg.name);
                panel.close(name);
            });

            // 移除 menu

            // 移除 main 对应的脚本缓存
            const main = join(info.path, info.pkg.getData('main'));
            utils.removeCache(main);

            info.enable = false;
            delete info.pkg;
            this.emit('disable', path, info);
            ipc.broadcast('editor3d-lib-package:emit', 'disable', path, info);

            // 在全局存储的数据内存入被关闭的插件
            const disableList = this.profiles.local.get('disable') || [];
            const enableList = this.profiles.local.get('enable') || [];
            let updated = false;
            if (disableList.indexOf(path) === -1) {
                disableList.push(path);
                this.profiles.local.set('disable', disableList);
                updated = true;
            }
            if (enableList.indexOf(path) !== -1) {
                const index = enableList.indexOf(path);
                disableList.splice(index, 1);
                this.profiles.local.set('enable', enableList);
                updated = true;
            }
            if (updated) {
                this.profiles.local.save();
            }
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = new PackageManager();

// 注册 package 的时候输出日志
packageManager.on('register', (info) => {
    console.log(`[Package] ${info.name}@${info.version} load`);
});

// 反注册 package 的时候输出日志
packageManager.on('unregister', (info) => {
    console.log(`[Package] ${info.name}@${info.version} unload`);
});

// 注册 packages 协议，暂时只需要指向内置插件目录
app.once('ready', () => {
    protocol.registerFileProtocol('packages', (request, callback) => {
        const uri = parse(request.url);
        const list = module.exports.getPackages({
            name: uri.host,
        });
        const pkg = list[0];
        if (!pkg) {
            return callback({ path: '' });
        }

        callback({
            path: join(pkg.path, uri.pathname),
        });
    });
});

// 页面进程调用主进程的方法
ipc.on('editor3d-lib-package:call', (event, name, ...args) => {
    return module.exports[name](...args);
});
