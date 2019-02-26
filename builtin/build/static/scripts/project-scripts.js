const virtualModule = require('virtual-module');

/**
 * TODO 对脚本进行整理，拆分为插件类脚本和普通脚本
 */
function sortScripts(scripts) {
    let mainPaths = [];
    let plugins = [];
    for (let asset of scripts) {
        if (!asset.isPlugin) {
            mainPaths.push(asset);
        } else {
            plugins.push(asset);
        }
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

function loadCommon(scriptAssetInfos) {
    virtualModule.reset();
    for (const scriptAssetInfo of scriptAssetInfos) {
        virtualModule.addAlias(scriptAssetInfo.source, (fromPath, request, alias) => {
            const result = scriptAssetInfo.library['.js'];
            // This may be caused by parsing error.
            if (result === undefined) {
                throw new Error(`Script (${scriptAssetInfo.source}) can't found in library, please check it`);
            }
            return result;
        });
    }
    for (const scriptAssetInfo of scriptAssetInfos) {
        require(scriptAssetInfo.source);
        console.info(`Script ${scriptAssetInfo.uuid}(${scriptAssetInfo.source}) mounted.`);
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
