'use strict';

// const setting = require('@editor/setting');

const { join, extname } = require('path');
const { parse } = require('url');
const { EventEmitter } = require('events');
const { app, protocol } = require('electron');
const { existsSync, readJsonSync, readdirSync, statSync, outputJSONSync } = require('fs-extra');
const ipc = require('@base/electron-base-ipc');
const packageManager = require('@editor/package');
const Profile = require('../../profile');

// 保存插件状态到 profile 里
const profile = {
    // 取项目中插件的状态等数据
    local: Profile.load('profile://local/packages/packages.json'),
    getPackage(path) {
        const packages = this.local.get('packages');
        const pkg = packages.filter((pkg) => pkg.path === path);
        if (pkg) {
            return pkg[0];
        }
        return;
    },
    timer: 0,
    save() {
        if (!Editor.Startup.ready.package) { // 重要：避免编辑器插件体系未完全启动时又写入启动状态
            return false;
        }
        const packages = module.exports.getPackages();
        const data = packages.map((pkg) => {
            return { // 暂时开放这些数据
                name: pkg.name,
                version: pkg.version,
                path: pkg.path,
                enable: pkg.enable,
                invalid: pkg.invalid,
            };
        });
        this.local.set('packages', data);
        this.local.save();
    },
};

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
            if ('enable' in options && options.enable !== pkg.enabled) {
                return;
            }
            if ('invalid' in options && options.invalid !== pkg.invalid) {
                return;
            }
            list.push({
                name: pkg.name,
                version: pkg.version,
                debug: pkg.debug,

                path,
                enable: pkg.enabled,
                invalid: pkg.invalid,

                info: pkg.options,
            });
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

            // 检查 项目/全局 插件是否要启动
            const pkg = profile.getPackage(path);
            if (pkg && pkg.enable) {
                this.enable(path);
            }

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
        await this.disable(path);

        await packageManager.unregister(path);
    }

    /**
     * 启用一个插件
     * @param {string} path
     */
    async enable(path) {
        await packageManager.enable(path);
        profile.save();
    }

    /**
     * 禁用一个插件
     * @param {string} path
     */
    async disable(path) {
        await this.close(path);

        await packageManager.disable(path);

        profile.save();
    }

    /**
     * 关闭已打开的面板
     * @param {*} path
     */
    async close(path) {
        const pkg = this.getPackages({path})[0];
        if (pkg) {
            await Editor.Panel.close(pkg.name);
        }
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
