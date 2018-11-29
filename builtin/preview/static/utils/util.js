const { basename, join,  extname } = require('path');
const { copyFileSync, ensureDir, outputFileSync} = require('fs-extra');

// 配置一个insert-module-globals 转换来检测和执行 process, Buffer, global, __dirname, __filename.
const TEMP_PATH = join(Editor.App.project, 'temp');

const DB_PROTOCOL_HEADER = 'db://';

// 设备配置信息
const DEVICES = {
    ipad: { name: 'iPhone 3Gs (480x320)', height: 480, width: 320},
    ipad_mini: { name: 'iPhone 4 (960x640)', height: 960, width: 640},
    iphone4: { name: 'iPhone 5 (1136x640)', height: 1136, width: 640},
    iphone5: { name: 'iPhone 6 (1334x750)', height: 1334, width: 750},
    iphone6: { name: 'iPhone 6 Plus (1920x1080)', height: 1920, width: 1080},
    iphone6_plus: { name: 'iPad (1024x768)', height: 1024, width: 768},
    ipad_retina: { name: 'iPad Retina (2048x1536)', height: 2048, width: 1536},
    android_800: { name: 'Android (800x480)', height: 800, width: 480},
    android_854: { name: 'Android (854x480)', height: 854, width: 480},
    android_1280: { name: 'Android (1280x720)', height: 1280, width: 720},
    customize: { name: '自定义', height: 960, width: 640},
};

async function getEnginInfo() {
    let info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
    return info;
}

// 去除 db:// 的路径
function getRightUrl(path) {
    if (!path.startsWith(DB_PROTOCOL_HEADER)) {
        console.error('unknown path to build: ' + path);
        return path;
    }
    // 获取剔除 db:// 后的文件目录
    let mountPoint = path.slice(DB_PROTOCOL_HEADER.length);
    if (!mountPoint) {
        console.error('unknown mount to build: ' + path);
        return null;
    }
    return mountPoint;
}

async function writScripts() {
    const assetList = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', {type: 'scripts'});
    let path = join(TEMP_PATH, '/quick-scripts');
    ensureDir(join(path, 'assets'));
    for (let i = 0; i < assetList.length; i++) {
        let asset = assetList[i];
        let tempPath = getRightUrl(asset.source);
        let ext = extname(tempPath);

        let name = basename(tempPath, ext);
        let scriptName = basename(asset.library['.js']).replace(asset.uuid, name);
        let mapName = basename(asset.library['.js.map']).replace(asset.uuid, name);
        let content = getModules(tempPath);
        outputFileSync(join(path, 'assets', scriptName), content);
        copyFileSync(asset.library['.js.map'], join(path, 'assets', mapName));
    }
    return path;
}

/**
 * 查询项目配置信息
 * @param {*} key
 */
async function getProSetting(key) {
    let value = await Editor.Ipc.requestToPackage('project-setting', 'get-setting', key);
    return value;
}

/**
 * 查询全局配置信息
 * @param {*} key
 * @returns
 */
async function getGroSetting(key) {
    return await Editor.Ipc.requestToPackage('preferences', 'get-setting', key);
}

module.exports = {
    getProSetting,
    getGroSetting,
    getEnginInfo,
    writScripts,
    DEVICES,
};
