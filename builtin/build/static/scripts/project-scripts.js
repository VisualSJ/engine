const {basename, extname} = require('path');
let modules = Object.create(null);
// 缓存模块信息
function addModule(path, name) {
    name = name || basename(path, extname(path));
    let m = modules[name];

    if (!m) {
        m = modules[name] = {
            name: name,
            path: path,
            children: [],
        };
    }

    return m;
}

/**
 * 注销和清理之前缓存的模块
 * @param {*} path
 */
function unregisterPathClass(path) {
    let name = basename(path, extname(path));
    delete require.cache[path];
    delete modules[name];
}

/**
 * 注册、导入模块
 * @param {*} path 模块路径
 */
function registerPathClass(path) {
    try {
        require(path);
    } catch (err) {
        console.error(`load script [${path}] failed : ${err.stack}`);
    }
}

/**
 * TODO 对脚本进行整理，拆分为插件类脚本和普通脚本
 */
function sortScripts(scripts) {
    let mainPaths = [];
    let plugins = [];
    for (let asset of scripts) {
        mainPaths.push(asset.library['.js']);
    }
    return {
        mainPaths,
        plugins,
    };
}

function loadScript(src, cb) {
    var scriptElement = document.createElement('script');
    scriptElement.onload = function() {
        scriptElement.remove();

        cb();
    };
    scriptElement.onerror = function() {
        scriptElement.remove();

        Editor.error('Failed to load %s', src);
        cb(new Error('Failed to load ' + src));
    };

    scriptElement.setAttribute('type', 'text/javascript');
    scriptElement.setAttribute('charset', 'utf-8');
    scriptElement.setAttribute('src', FireUrl.addRandomQuery(src));

    document.head.appendChild(scriptElement);
}

// 导入插件模块
function loadPlugins(paths) {
    // 注册脚本
    for (let i = 0; i < paths.length; i++) {
        loadScript(DISABLE_COMMONJS_PROTOCOL + paths[i]);
    }
}

function loadCommon(paths) {
    // 把之前注册过缓存的脚本信息删除
    if (modules && modules.length > 0) {
        for (let name of Object.keys(modules)) {
            unregisterPathClass(modules[name].path);
        }
    }

    modules = {};
    // 导入脚本模块
    paths.forEach((path) => {
        addModule(path);
    });
    // 注册脚本
    for (let i = 0; i < paths.length; i++) {
        registerPathClass(paths[i]);
    }
}

/**
 * 导入项目脚本模块
 * @param {*} scripts
 */
function load(scripts) {
    let {mainPaths, plugins} = sortScripts(scripts);
    // loadPlugins(plugins);
    loadCommon(mainPaths);
}
exports.load = load;
