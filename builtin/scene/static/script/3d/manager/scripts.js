'use stirct';

const ipc = require('./ipc');
const { extname, isAbsolute, resolve, basename} = require('path');
const uuidUtils = require('../../utils/uuid');
const model = require('module');
const _ = require('lodash');
const raw2library = {}; // 存储实际路径与 library 路径的索引 map,(路径默认带有扩展名)
const scriptNames = new Set(); // 存储现有脚本名称
function isNodeModulePath(path) {
    return path.replace(/\\/g, '/').indexOf('/node_modules/') !== -1;
}

function setModuleResolve() {
    model._resolveFilenameVendor = model._resolveFilename;
    model._resolveFilename = function(request, parent, isMain) {
        if (Object.keys(raw2library).length > 0) {
            let rawPath = request;
            if (!isAbsolute(request)) {
                rawPath = resolve(parent.filename, request);
            }
            // 不带扩展名，先查找 js
            if (extname(rawPath) === '') {
                const path = rawPath + '.js';
                if (!raw2library[path]) {
                    rawPath += '.ts';
                }
            }
            let libraryPath = raw2library[rawPath];
            if (!isNodeModulePath(parent.filename) && libraryPath) {
                return libraryPath;
            }
        }
        return model._resolveFilenameVendor(request, parent, isMain);
    };
}

function _loadScriptInEngin(uuid) {
    const sid = uuidUtils.compressUuid(uuid);
    const ctor = cc.js._registeredClassIds[sid];
    if (ctor) {
        let idToClass = cc.js._registeredClassIds;
        cc.js._registeredClassIds = idToClass;

        let nameToClass = cc.js._registeredClassNames;
        cc.js._registeredClassNames = nameToClass;
    }
}

async function init() {
    const scripts = await ipc.send('query-scripts');
    if (!model._resolveFilenameVendor) {
        setModuleResolve();
    }
    await _loadScripts(scripts);
}

/**
 * 传入 uuid，加载指定的文件，如果文件已加载会更新
 * @param {*} uuid
 */
async function loadScript(uuid) {
    if (!uuid) {
        return;
    }
    const asset = await ipc.send('query-asset-info', uuid);
    const canLoad = await removeScript(asset);
    if (!canLoad) {
        return;
    }
    const name = basename(asset.file, extname(asset.file));
    scriptNames.add(name);
    const {userData} = await ipc.send('query-asset-meta', uuid);
    if (userData.isPlugin && !userData.loadPluginInEditor) {
        return;
    }
    raw2library[asset.file] =  asset.library['.js'];
    require(asset.file);
    _loadScriptInEngin(uuid);
}

/**
 * 加载多个脚本，仅在初始化时使用
 * @param {*} scripts
 */
async function _loadScripts(scripts) {
    // 同时加载多个脚本时有依赖关系脚本，有可能会因为顺序问题报错，因而需要优先注册所有的脚本进去,再去执行脚本加载
    for (const asset of scripts) {
        const canLoad = await removeScript(asset);
        if (!canLoad) {
            continue;
        }
        const name = basename(asset.file, extname(asset.file));
        scriptNames.add(name);

        const {userData} = await ipc.send('query-asset-meta', asset.uuid);
        let result;
        // 插件脚本别名实际调用的路径是 asset 下的
        if (userData.isPlugin && !userData.loadPluginInEditor) {
            continue;
        }
        // 验证完当前脚本是可加载后才可以 require
        result = asset.library['.js'];
        // This may be caused by parsing error.
        if (result === undefined) {
            throw new Error(`Script (${asset.source}) can't found in library, please check it`);
        }
        raw2library[asset.file] = result;
    }
    for (const asset of scripts) {
        require(asset.file);
        _loadScriptInEngin(asset.uuid);
        console.info(`Script ${asset.uuid}(${asset.file}) mounted.`);
    }
}

/**
 * 根据 asset 移除对应的脚本缓存
 * @param {*} asset
 */
async function removeScript(asset) {
    const name = basename(asset.file, extname(asset.file));
    // 未曾导入过的脚本，需要判断是否有重名
    if (!raw2library[asset.file]) {
        if (scriptNames.has(name)) {
            console.error(`Load script(${asset.file}) failed! Script with the same name has exist, please replace a new name;`);
            return false;
        }
        return true;
    }
    scriptNames.delete(name);
    delete raw2library[asset.file];
    // 移除 require 中的缓存
    delete require.cache[asset.library['.js']];
    // 移除引擎内的索引
    const sid = uuidUtils.compressUuid(asset.uuid);
    const ctor = cc.js._registeredClassIds[sid];
    if (ctor) {
        cc.js.unregisterClass(ctor);
    }
    return true;
}

module.exports = {
    init,
    loadScript,
    removeScript,
};
