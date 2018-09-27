'use strict';

const fs = require('fs');
const ps = require('path');
const { app, protocol } = require('electron');
const menuManager = require('@base/electron-menu');
const packageManager = require('@editor/package');
const i18n = require('@base/electron-i18n');
const setting = require('@editor/setting');
const chokidar = require('chokidar');

/**
 * 注册一个插件内申明的 menu
 * @param {*} pkg
 */
let registerMenu = function(pkg) {
    let menu = pkg.getData('menu');
    Object.keys(menu || {}).forEach((key) => {
        let options = menu[key];

        // 翻译 menu
        let items = key.split('/');
        items = items.map((item) => {
            if (!item.startsWith('i18n:')) {
                return item;
            }
            let str = item.substr(5);
            return i18n.translation(str) || str;
        });

        // 实际插入 menu
        menuManager.add(items.join('/'), {
            icon: options.icon ? ps.join(pkg._path, options.icon) : undefined,
            accelerator: options.accelerator,
            group: options.group || 'default',
            click() {
                packageManager.send(pkg.name, options.message, ...(options.params || []));
            },
        });
    });
    menuManager.apply();
};

let name2package = {};

// 切换语言之后 menu 会清空所有的 menu
// 这一部分的注册在 menu 之后，所以 menu 的会也需要先触发
// 所以需要重新注册
i18n.on('switch', () => {
    Object.keys(name2package).forEach((name) => {
        let pkg = name2package[name];
        registerMenu(pkg);
    });
});

/**
 * 注册调试依赖的文件
 */
packageManager.debugRely({
    editor: __dirname + '/debug.js',
});

class PackageManager {

    /**
     * 开始加载插件
     * @param {*} path
     */
    async load(path) {
        // 加载 package
        let pkg = await packageManager.register(path);

        name2package[pkg.name] = pkg;

        // 检查是否有 i18n 数据
        let i18nDirname = ps.join(path, 'i18n');
        if (fs.existsSync(i18nDirname)) {
            let languages = fs.readdirSync(i18nDirname);
            languages.forEach((language) => {
                let languageFile = ps.join(i18nDirname, language);
                let data = require(languageFile);
                let json = {};
                json[pkg.name] = data;
                i18n.register(json, ps.basename(language, '.js'));
            });
        }

        // 注册 package.json 内定义的 menu
        registerMenu(pkg);
    }

    /**
     * 开始卸载插件
     * @param {*} path
     */
    async unload(path) {
        let pkg = await packageManager.unregister(path);

        // 删除索引
        delete name2package[pkg.name];

        // 注销 package.json 内定义的 menu
        let menu = pkg.getData('menu');
        Object.keys(menu || {}).forEach((key) => {
            menuManager.remove(key);
        });

        // 应用 menu 修改
        menuManager.apply();
    }

    /**
     * 重新加载插件
     * @param {*} path
     */
    async reload(path) {
        await this.unload(path);
        await this.load(path);
    }

    /**
     * 启动文件夹监听
     */
    watch() {
        // 定义需要监听的文件夹数组
        const dirname = [
            ps.join(setting.PATH.HOME, './packages'), // home 包的全局文件路径
            ps.join(setting.PATH.PROJECT, './packages') // project 插件包的项目文件路径
        ];

        const watcher = chokidar.watch(dirname, {
            // ignoreInitial:true, // 设置初始化时是否需要忽略回调（即原文件目录下的）
            depth: 0 // 设置监听的子目录层级数
        });

        // 添加文件夹的回调事件
        watcher.on('addDir', (path) => {
            // 判断是否为插件（存在package.json文件)
            let dirname = ps.join(path, './package.json');
            if (!fs.existsSync(dirname)) {
                return;
            }
            // 当文件夹内为插件时，导入该插件
            this.load(path);
        });

        // 删除监听目录下文件夹（不包括子目录）后的回调
        watcher.on('unlinkDir', (path) => {
            // 查找已有缓存的包信息，找到即卸载
            for (let item of name2package) {
                if (item === path) {
                    this.unload(path);
                    break;
                }
            }
        });
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
        const url = request.url.substr(11);
        callback({
            path: ps.join(__dirname, '../../builtin', url)
        });
    });
});
