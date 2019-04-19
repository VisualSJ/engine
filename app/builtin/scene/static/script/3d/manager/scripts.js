'use stirct';

const ipc = require('./ipc');
const scene = require('./scene');
const { extname, isAbsolute, resolve, basename, dirname} = require('path');
const uuidUtils = require('../../utils/uuid');
const model = require('module');
const _ = require('lodash');
require("@editor/cocos-script/systemjs");

const raw2library = {}; // 存储实际路径与 library 路径的索引 map,(路径默认带有扩展名)
const library2raw = {};
const uuid2raw = {};
const scriptNames = new Set(); // 存储现有脚本名称

function _loadScriptInEngine(uuid) {
    const sid = uuidUtils.compressUuid(uuid);
    const ctor = cc.js._registeredClassIds[sid];
    if (ctor) {
        let idToClass = cc.js._registeredClassIds;
        cc.js._registeredClassIds = idToClass;

        let nameToClass = cc.js._registeredClassNames;
        cc.js._registeredClassNames = nameToClass;
    }
}

let reloadTimer = null;
function reload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
        scene.softReload();
    }, 400);
}

async function init(project) {
    projectPath = project;
    const scripts = await ipc.send('query-scripts');
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

    const url = userData.moduleId;
    await System.delete(url);

    raw2library[asset.file] =  asset.library['.js'];
    library2raw[asset.library['.js']] =  asset.file;
    uuid2raw[uuid] = asset.file

    require(asset.library['.js']);
    console.info(`Script ${asset.uuid}(${asset.file}) mounted.`);

    console.log(`Load script ${url}`);
    await System.import(url);

    _loadScriptInEngine(uuid);

    reload();
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
            console.error(`Script (${asset.source}) can't found in library, please check it`);
            continue;
        }

        raw2library[asset.file] = result;
        library2raw[result] = asset.file;
        uuid2raw[asset.uuid] = asset.file

        try {
            require(asset.library['.js']);
            console.info(`Script ${asset.uuid}(${asset.file}) mounted.`);
        } catch(error) {
            console.error(`Script (${asset.source}) load failed, please check it`);
            console.error(error);
            continue;
        }

        try {
            const url = userData.moduleId;
            console.log(`Load script ${url}`);
            await System.import(url);
        } catch(error) {
            console.error(`Script (${asset.source}) load failed, please check it`);
            console.error(error);
            continue;
        }
    }

    reload();
}

/**
 * 根据 asset 移除对应的脚本缓存
 * @param {*} asset
 */
async function removeScript(asset) {
    const name = basename(asset.file, extname(asset.file));

    // 未曾导入过的脚本，需要判断是否有重名
    if (!uuid2raw[asset.uuid]) {
        if (scriptNames.has(name)) {
            console.error(`Load script(${asset.file}) failed! Script with the same name has exist, please replace a new name;`);
            return false;
        }
        return true;
    }
    scriptNames.delete(name);

    // 移除部分 map
    delete raw2library[asset.file];
    delete library2raw[asset.library['.js']];
    delete uuid2raw[asset.uuid];

    // 移除 require 中的缓存
    delete require.cache[asset.library['.js']];

    // 移除引擎内的索引
    const sid = uuidUtils.compressUuid(asset.uuid);
    const ctor = cc.js._registeredClassIds[sid];

    cc.js.unregisterClass(ctor);

    // 清除 menu 里面的缓存
    for (let i = 0; i < cc._componentMenuItems.length; i++) {
        const item = cc._componentMenuItems[i];
        if (item && item.component === ctor) {
            cc._componentMenuItems.splice(i, 1);
            break;
        }
    }

    return true;
}

module.exports = {
    init,
    loadScript,
    removeScript,
};
