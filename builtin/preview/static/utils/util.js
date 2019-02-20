const { basename, join,  extname } = require('path');
const { copyFileSync, ensureDir, outputFileSync} = require('fs-extra');
const { EventEmitter} = require('events');
// 配置一个insert-module-globals 转换来检测和执行 process, Buffer, global, __dirname, __filename.
const TEMP_PATH = join(Editor.App.project, 'temp');

const DB_PROTOCOL_HEADER = 'db://';

// 设备配置信息
const DEVICES = {
    default: { name: 'default', height: 960, width: 640},
    ipad: { name: 'Apple iPad', width: 1024, height: 768, ratio: 2 },
    ipad_mini: { name: 'Apple iPad Mini', width: 1024, height: 768, ratio: 1 },
    iPhone4: { name: 'Apple iPhone 4', width: 320, height: 480, ratio: 2 },
    iPhone5: { name: 'Apple iPhone 5', width: 320, height: 568, ratio: 2 },
    iPhone6: { name: 'Apple iPhone 6', width: 375, height: 667, ratio: 2 },
    iPhone6_plus: { name: 'Apple iPhone 6 Plus', width: 414, height: 736, ratio: 3 },
    huawei9: { name: 'Huawei P9', width: 540, height: 960, ratio: 2},
    huawei_mate9_pro: { name: 'Huawei Mate9 Pro', width: 720, height: 1280, ratio: 2},
    nexu4: { name: 'Goolge Nexus 4', width: 384, height: 640, ratio: 2 },
    nexu5: { name: 'Goolge Nexus 5', width: 360, height: 640, ratio: 3 },
    nexu6: { name: 'Goolge Nexus 6', width: 412, height: 732, ratio: 3.5 },
    nexu7: { name: 'Goolge Nexus 7', width: 960, height: 600, ratio: 2 },
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
