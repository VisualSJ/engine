'use strict';

const {existsSync, readdirSync, statSync} = require('fs');
const {readJsonSync, outputJsonSync} = require('fs-extra');
const {join, basename} = require('path');
const { app, protocol } = require('electron');
const menuManager = require('@base/electron-menu');
const packageManager = require('@editor/package');
const i18n = require('@base/electron-i18n');
const setting = require('@editor/setting');
const chokidar = require('chokidar');
const ipc = require('./../ipc');
const EventEmitter = require('events').EventEmitter;

// 插件包存放路径汇总
const packagePaths = {
    internal: join(setting.PATH.APP, './builtin'), // 内置插件
    project: join(setting.PATH.PROJECT, './packages'), // 项目本地插件
    home: join(setting.PATH.HOME, './packages'), // 全局插件
};

// 定义不能被覆盖替代的内置插件名
const lockPackageNames = ['secne'];

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
            icon: options.icon ? join(pkg._path, options.icon) : undefined,
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
let pkgCollection = {};

// 获取项目内对插件的配置, 配置会发生更改，需要实时获取
const getPkgConfig = function() {
    let pkgConfigPath = join(packagePaths.project, './package-manager.json');
    // 不存在配置文件则创建
    if (!existsSync(pkgConfigPath)) {
        let json = {disabled: {}, enable: {}};
        outputJsonSync(pkgConfigPath, json);
        return json;
    }
    return readJsonSync(pkgConfigPath);
};

// 处理获取插件的 package.json 内容信息
const getPkgPackage = function(path) {
    let json = readJsonSync(join(path, 'package.json'));
    json.path = path;
    return json;
};

// 检测是否应该加载该插件
const shouldInstall = function(path, type) {
    // 未存在记录的包信息时，重新获取
    if (!pkgCollection[path]) {
        let pkgJson = getPkgPackage(path);
        pkgJson.type = type;
        pkgCollection[path] = pkgJson;
    }
    let pkgJson = pkgCollection[path];
    if (lockPackageNames.indexOf(pkgJson.name) !== -1) {
        console.error(`${pkgJson.name} is a unchangeable plugin`);
        return false;
    }
    let pkgConfig = getPkgConfig();
    // 插件本身设置为可用
    if (!pkgJson.disabled) {
        if (type !== 'project' && Object.keys(pkgConfig.disabled).indexOf(path) !== -1) {
            // 全局或内置插件， 而项目本地对该插件设置了 disabled
            return false;
        }
        return true;
    }
    // 插件本身设置为不可用
    if (type !== 'project' && Object.keys(pkgConfig.enable).indexOf(path) !== -1) {
        // 全局或内置插件， 而项目本地对该插件设置了 enable
        return true;
    }
    return false;
};

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

class PackageManager extends EventEmitter {

    // 文件内所有插件
    get packages() {
        return pkgCollection;
    }

    // 已安装可用的插件
    get loadPackages() {
        return name2package;
    }

    // 返回各个位置插件包的路径
    get paths() {
        return packagePaths;
    }

    /**
     * 开始加载插件
     * @param {*} path
     * @param {*} type 插件类型 internal home project （内置，全局，项目）
     */
    async load(path, type = 'internal') {
        // 检测是否该加载插件
        if (!shouldInstall(path, type)) {
            pkgCollection[path].project = 'disabled';
            pkgCollection[path].load = false;
            return;
        }
        pkgCollection[path].project = 'enable';
        pkgCollection[path].load = true;
        let name = pkgCollection[path].name;
        // 如存在已有同名插件，且为可替换插件，则卸载原插件
        if (Object.keys(name2package).indexOf(name) !== -1
        && lockPackageNames.indexOf(name) !== -1) {
            await this.unload(name2package[name]);
        }
        // 存在与不可更改插件同名时报错提示

        // 加载 package
        let pkg ;
        try {
            pkg = await packageManager.register(path);
        } catch (error) {
            console.error(error);
        }

        name2package[pkg.name] = pkg;

        // 检查是否有 i18n 数据
        let i18nDirname = join(path, 'i18n');
        if (existsSync(i18nDirname)) {
            let languages = readdirSync(i18nDirname);
            languages.forEach((language) => {
                let languageFile = join(i18nDirname, language);
                let data = require(languageFile);
                let json = {};
                json[pkg.name] = data;
                i18n.register(json, basename(language, '.js'));
            });
        }

        // 注册 package.json 内定义的 menu
        registerMenu(pkg);
        this.emit('updatePlugin');
        // 内置插件
        if (type === 'internal') {
            watchRequire(pkg.name);
        }
    }

    /**
     * 载入插件文件夹,遍历第一层文件夹加载插件
     * @param {*} dirname 插件文件夹
     * @param {*} type 插件类型 internal home project （内置，全局，项目）
     */
    async loadFolder(dirname, type = 'internal') {
        if (!existsSync(dirname)) {
            return;
        }
        this.emit('updatePlugin');
        let names = readdirSync(dirname);
        for (const name of names) {
            let path = join(dirname, name);
            let stat = statSync(path);
            if (stat.isDirectory()) {
                // 判断是否为插件（存在package.json文件)
                let pkg = join(path, './package.json');
                if (!existsSync(pkg)) {
                    return;
                }
                // 加载插件
                try {
                    await this.load(path, type);
                } catch (error) {
                    console.error(error);
                }
            }
        }
    }

    /**
     * 开始卸载插件
     * @param {*} path
     * @param {*} type 插件类型 internal home project （内置，全局，项目）
     */
    async unload(path, type = 'internal') {
        let pkg;
        try {
            pkg = await packageManager.unregister(path);
        } catch (error) {
            console.error(error);
        }
        // 内置插件
        if (type === 'internal') {
            unwatchRequire(pkg.name, path);
        }
        // 删除索引
        delete name2package[pkg.name];
        // 注销 package.json 内定义的 menu
        let menu = pkg.getData('menu');
        Object.keys(menu || {}).forEach((key) => {
            menuManager.remove(key);
        });

        // 应用 menu 修改
        menuManager.apply();
        this.emit('updatePlugin');
    }

    /**
     * 禁用某个插件
     * 仅在全局或内置插件需要在当前项目 disabled 时传入 flag = 'project'
     * @param {*} path 插件路径，必填
     * @param {*} type 插件类型，必填
     * @param {*} projectFlag 是否仅在当前项目禁用标识符
     * @returns
     * @memberof PackageManager
     */
    async disabled(path, type = 'internal', projectFlag) {
        // 仅对当前项目设置
        if (projectFlag) {
            let pkgConfigPath = join(packagePaths.project, './package-manager.json');
            let pkgConfig = getPkgConfig();
            pkgConfig.disabled[path] = path;
            pkgCollection[path].disabled = true;
            pkgCollection[path].project = 'disabled';
            // 需要清理该路径在 enable 里的记录
            if (pkgConfig.enable[path]) {
                delete pkgConfig.enable[path];
            }
            outputJsonSync(pkgConfigPath, pkgConfig);
            await this.unload(path, type);
            return;
        }
        let pkgJson = getPkgPackage(path);
        pkgJson.disabled = true;
        pkgCollection[path].disabled = true;
        outputJsonSync(join(path, './package.json'), pkgJson);
        await this.unload(path, type);
    }

    /**
     *
     * 启用某个插件
     * @param {*} path 插件路径，必填
     * @param {*} type 插件类型，必填
     * @param {*} projectFlag 是否仅在当前项目启用标识符，选填
     * @memberof PackageManager
     */
    async enable(path, type = 'internal', projectFlag) {
        if (projectFlag) {
            let pkgConfigPath = join(packagePaths.project, './package-manager.json');
            let pkgConfig = getPkgConfig();
            pkgConfig.enable[path] = path;
            // 需要清理该路径在 disabled 里的记录
            if (pkgConfig.disabled[path]) {
                delete pkgConfig.disabled[path];
            }
            outputJsonSync(pkgConfigPath, pkgConfig);
            await this.load(path, type);
            return;
        }
        let pkgJson = getPkgPackage(path);
        pkgJson.disabled = false;
        pkgCollection[path].disabled = false;
        pkgCollection[path].project = 'enable';
        outputJsonSync(join(path, './package.json'), pkgJson);
        await this.load(path, type);
    }

    /**
     * 重新加载插件
     * @param {*} path
     * @param {*} type 插件类型 internal home project （内置，全局，项目）
     */
    async reload(path, type = 'internal') {
        await this.unload(path, type);
        await this.load(path, type);
    }

    /**
     * 启动文件夹监听
     */
    watch() {
        // 定义需要监听的文件夹数组
        const dirname = [
            this.paths.home, // home 包的全局文件路径
            this.paths.project // project 插件包的项目文件路径
        ];

        const watcher = chokidar.watch(dirname, {
            ignoreInitial: true, // 设置初始化时是否需要忽略回调（即原文件目录下的）
            depth: 0 // 设置监听的子目录层级数
        });

        // 添加文件夹的回调事件
        watcher.on('addDir', (path) => {
            // 判断是否为插件（存在package.json文件)
            let dirname = join(path, './package.json');
            setTimeout(() => {
                if (!existsSync(dirname)) {
                    return;
                }
                let type = 'project';
                if (path.indexOf(join(setting.PATH.HOME, './packages')) !== -1) {
                    type = 'home';
                }
                // 检测是否该加载插件
                if (!shouldInstall(path, type)) {
                    this.load(path, type);
                }
                this.emit('updatePlugin');
            }, 1000);
        });

        // 删除监听目录下文件夹（不包括子目录）后的回调
        watcher.on('unlinkDir', (path) => {
            // 避免触发两次事件通知
            let unloadFlag = false;
            // 查找已有缓存的包信息，找到即卸载
            Object.keys(name2package).forEach((key) => {
                if (name2package[key]._path === path) {
                    this.unload(path, pkgCollection[path].type);
                    unloadFlag = true;
                }
            });
            delete pkgCollection[path];
            this.emit('updatePlugin');
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
            path: join(__dirname, '../../builtin', url)
        });
    });
});

// *************************************************************************
// ************* 监听 builtin 内主进程文件更改变化后 reload 插件 *************//

// 收集监听文件变化的 watch 对象
const watchers = [];
const pkgCaches = [];
/**
 * 获取文件缓存依赖
 * @param {*} pkgName
 * @param {*} mainPath
 */
function watchRequire(pkgName) {
    let path = join(__dirname, '../../builtin', pkgName);
    let info = readJsonSync(join(path, './package.json'));
    let mainPath = join(path, info.main);
    let cacheModule = require.cache[mainPath];
    pkgCaches[pkgName] = [];
    getPkgCaches(pkgName, cacheModule);
    let watcher = chokidar.watch(pkgCaches[pkgName], {
        ignoreInitial: true, // 设置初始化时是否需要忽略回调（即原文件目录下的）
        depth: 0, // 只监听到当前层
    });

    // 添加文件夹的回调事件
    watcher.on('change', (path) => {
        module.exports.reload(join(__dirname, '../../builtin', pkgName));
    });
    watchers[pkgName] = watcher;
}

/**
 * 递归获取正确的依赖文件
 *
 * @param {*} pkgName
 * @param {*} cacheModule
 * @returns
 */
function getPkgCaches(pkgName, cacheModule) {
    if (cacheModule instanceof Array) {
        cacheModule.forEach((item) => {
            if (!item.id || item.id.match('node_modules')) {
                return;
            }
            pkgCaches[pkgName].push(item.id);
        });
    } else {
        if (!cacheModule || !cacheModule.id || cacheModule.id.match('node_modules')) {
            return;
        }
        pkgCaches[pkgName].push(cacheModule.id);
    }
    if (cacheModule.children && cacheModule.children.length > 0) {
        getPkgCaches(pkgName, cacheModule.children);
    }
}

/**
 * 清空记录的缓存依赖，以及停止监听
 * @param {*} pkgName 插件名
 * @param {*} pkgPath 插件路径
 */
function unwatchRequire(pkgName, pkgPath) {
    watchers[pkgName] && watchers[pkgName].unwatch(pkgCaches[pkgName]);
    watchers[pkgName] = null;
    delete require.cache[pkgPath];
}
