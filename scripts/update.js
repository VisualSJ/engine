'use strict';

const spawn = require('child_process').spawn;

const packages = {
    "@base/electron-base-ipc": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-base-ipc.tgz",
    "@base/electron-i18n": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-i18n.tgz",
    "@base/electron-logger": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-logger.tgz",
    "@base/electron-menu": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-menu.tgz",
    "@base/electron-profile": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-profile.tgz",
    "@base/electron-windows": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-windows.tgz",
    "@editor/dock": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/dock.tgz",
    "@editor/ipc": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/ipc.tgz",
    "@editor/package": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/package.tgz",
    "@editor/panel": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/panel.tgz",
    "@editor/project": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/project.tgz",
    "@editor/setting": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/setting.tgz",
    "asset-db": "http://192.168.52.109/TestBuilds/Editor-3d/resources/master/asset-db.tgz",
};

/**
 * 清空 npm cache
 */
const clean = function () {
    return new Promise((resolve, reject) => {
        let child = spawn('npm', ['cache', 'clean', '-f']);
        child.on('error', reject);
        child.on('exit', resolve);
    });
}

/**
 * 安装指定的模块
 * @param {*} url 
 */
const install = function (url) {
    return new Promise((resolve, reject) => {
        let child = spawn('npm', ['install', '-f', url]);
        child.on('error', reject);
        child.on('exit', resolve);
    });
}

/**
 * 卸载指定的模块
 * @param {*} name 
 */
const uninstall = function (name) {
    return new Promise((resolve, reject) => {
        let child = spawn('npm', ['uninstall', name]);
        child.on('error', reject);
        child.on('exit', resolve);
    });
}

// 整理传入的模块数量
let names = process.argv.slice(2);
names = names.filter((name) => {
    return !!packages[name];
});
if (names.length === 0) {
    names = Object.keys(packages);
}

/**
 * 实际更新的逻辑
 */
const update = async function () {
    await clean();
    for (let i=0; i<names.length; i++) {
        let name = names[i];
        console.log(`reinstall - ${name}`);
        await uninstall(name);
        await install(packages[name]);
    }
}

update();