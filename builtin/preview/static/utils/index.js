const { basename, join,  extname } = require('path');
const { copyFileSync, ensureDir, outputFileSync} = require('fs-extra');
const { EventEmitter} = require('events');
// 配置一个insert-module-globals 转换来检测和执行 process, Buffer, global, __dirname, __filename.
const TEMP_PATH = join(Editor.App.project, 'temp');

const DB_PROTOCOL_HEADER = 'db://';

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

module.exports = {
    getEnginInfo,
    writScripts,
};
