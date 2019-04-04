const { requestToPackage, getRightUrl, isNodeModulePath} = require('./utils');
const { extname, isAbsolute, resolve, dirname} = require('path');
const buildResult = require('./build-result');
const model = require('module');
require('@editor/cocos-script/systemjs');
let raw2library = {};
let library2raw = {};

/**
 * 对脚本进行整理，拆分为插件类脚本和普通脚本，缓存 asset
 */
async function sortScripts(scriptAssets) {
    let scripts = [];
    let jsList = [];
    let moduleIds = [];
    for (let asset of scriptAssets) {
        asset.url = getRightUrl(asset.source);
        const {userData} = await requestToPackage('asset-db', 'query-asset-meta', asset.uuid);
        moduleIds.push(userData.moduleId);
        if (userData.isPlugin &&
            (userData.isNative && userData.loadPluginInNative || userData.loadPluginInWeb)) {
            jsList.push(asset.url);
        } else {
            asset.url = asset.url.replace(/\.ts$/, '.js');
            scripts.push({uuid: asset.uuid, file: asset.url});
        }
        raw2library[asset.file] = asset.library['.js'];
        library2raw[asset.library['.js']] = asset.file;
        buildResult.script2library[asset.url] = asset.library['.js'];
        buildResult.script2raw[asset.url] = asset.file;
    }
    return {scripts, jsList, moduleIds};
}

async function loadScripts(scriptAssets) {
    for (const asset of scriptAssets) {
        const raw = asset.library['.js'];
        if (!raw) {
            console.error(`Script asset ${asset.uuid} doesn't have library file.`);
            continue;
        }
        require(raw);
    }
    for (const asset of scriptAssets) {
        const raw = asset.library['.js'];
        if (!raw) {
            console.error(`Script asset ${asset.uuid} doesn't have library file.`);
            continue;
        }
        const {userData} = await requestToPackage('asset-db', 'query-asset-meta', asset.uuid);
        await System.import(userData.moduleId);
    }
}

/**
 * 导入项目脚本模块
 * @param {*} scripts
 */
async function load(scripts) {
    // raw2library = {};
    const result = await sortScripts(scripts);
    // if (!buildResult.options || buildResult.options.type !== 'build-release') {
    //     return result;
    // }

    await loadScripts(scripts);
    return result;
}

exports.load = load;
