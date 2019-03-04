const { requestToPackage, getRightUrl, isNodeModulePath } = require('./utils');
const { extname, isAbsolute, resolve} = require('path');
const buildResult = require('./build-result');
const model = require('module');
let raw2library = {};

/**
 * 对脚本进行整理，拆分为插件类脚本和普通脚本，缓存 asset
 */
async function sortScripts(scriptAssets) {
    let scripts = [];
    let jsList = [];
    for (let asset of scriptAssets) {
        asset.url = getRightUrl(asset.source);
        const {userData} = await requestToPackage('asset-db', 'query-asset-meta', asset.uuid);
        if (userData.isPlugin &&
            (userData.isNative && userData.loadPluginInNative || userData.loadPluginInWeb)) {
            jsList.push(asset.url);
            raw2library[asset.file] = asset.library['.js'];
        } else {
            scripts.push({uuid: asset.uuid, file: asset.url});
            raw2library[asset.file] = asset.library['.js'];
        }
        buildResult.script2uuid[asset.url] = asset.uuid;
    }
    return {scripts, jsList};
}

function loadScripts() {
    for (const file of Object.keys(raw2library)) {
        require(file);
        console.info(`Script (${file}) mounted.`);
    }
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

/**
 * 导入项目脚本模块
 * @param {*} scripts
 */
async function load(scripts) {
    raw2library = {};
    const result = await sortScripts(scripts);
    if (buildResult.options.type !== 'build-release') {
        return result;
    }

    if (!model._resolveFilenameVendor) {
        setModuleResolve();
    }

    loadScripts();
    return result;
}
exports.load = load;
