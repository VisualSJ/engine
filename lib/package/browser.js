'use strict';

const fs = require('fs');
const ps = require('path');
const menuManager = require('@base/electron-menu');
const packageManager = require('@editor/package');
const i18n = require('@base/electron-i18n');

/**
 * 注册调试依赖的文件
 */
packageManager.debugRely({
    editor: __dirname + '/debug.js',
});

/**
 * 注册一个插件内申明的 menu
 * @param {*} pkg 
 */
let registerMenu = function (pkg) {
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
            click () {
                packageManager.send(pkg.name, options.message, ...(options.params || []));
            },
        })
    });
    menuManager.apply();
};

let name2package = {};

// 切换语言之后 menu 会清空所有的 menu
// 所以需要重新注册
i18n.on('switch', () => {
    Object.keys(name2package).forEach((name) => {
        let pkg = name2package[name];
        registerMenu(pkg);
    });
});

class PackageManager {

    /**
     * 开始加载插件
     * @param {*} path 
     */
    async load (path) {
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
    async unload (path) {
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
    async reload (path) {
        await this.unload(path);
        await this.load(path);
    }
};

module.exports = new PackageManager();

// 注册 package 的时候输出日志
packageManager.on('register', (info) => {
    console.log(`[Package] ${info.name}@${info.version} load`);
});

// 反注册 package 的时候输出日志
packageManager.on('unregister', (info) => {
    console.log(`[Package] ${info.name}@${info.version} unload`);
});