'use strict';

const cp = require('child_process');
const chalk = require('chalk');
const path = require('path');
const exec = require('child_process').exec;

const packages = {
    '@base/electron-base-ipc': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-base-ipc.tgz',
    '@base/electron-i18n': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-i18n.tgz',
    '@base/electron-logger': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-logger.tgz',
    '@base/electron-menu': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-menu.tgz',
    '@base/electron-profile': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-profile.tgz',
    '@base/electron-windows': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-windows.tgz',
    '@base/electron-worker': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@base/electron-worker.tgz',
    '@editor/dock': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/dock.tgz',
    '@editor/ipc': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/ipc.tgz',
    '@editor/package': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/package.tgz',
    '@editor/panel': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/panel.tgz',
    '@editor/project': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/project.tgz',
    '@editor/setting': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/@editor/setting.tgz',
    'asset-db': 'http://192.168.52.109/TestBuilds/Editor-3d/resources/master/asset-db.tgz',
};

/**
 * 执行一个控制台命令
 * @param {*} cmd
 * @param {*} options
 */
function cmd(cmd, options) {
    return new Promise((resolve, reject) => {
        let child = cp.spawn(process.platform === 'win32' ? `${cmd}.cmd` : cmd, options.args, {
            stdio: options.stdio || [0, 1, 2],
            cwd: options.root || process.cwd(),
        });

        child.on('exit', (code) => {
            if (code !== 0) {
                reject(code);
            } else {
                resolve(code);
            }
        });
    });
}

/**
 * 清空 npm cache
 */
const clean = function() {
    return new Promise((resolve, reject) => {
        exec('npm cache clean -f', (error) => {
            if (error) {
                return reject(error);
            }

            resolve();
        });
    });
};

/**
 * 安装指定的模块
 * @param {*} url
 */
const install = function(url) {
    return new Promise((resolve, reject) => {
        exec(`npm install ${url}`, (error) => {
            if (error) {
                return reject(error);
            }

            resolve();
        });
    });
};

/**
 * 卸载指定的模块
 * @param {*} name
 */
const uninstall = function(name) {
    return new Promise((resolve, reject) => {
        exec(`npm uninstall ${name}`, (error) => {
            if (error) {
                return reject(error);
            }

            resolve();
        });
    });
};

/**
 * 实际更新的逻辑
 */
const update = async function() {

    // 传入 --module 参数
    let names = process.argv.slice(2);
    const onlyModule = names[0] === '--module';
    const onlyRepo = names[0] === '--repo';

    const updateModule = names.length === 0 || onlyModule;
    if (!onlyRepo && updateModule) {
        console.log(chalk.cyanBright('Update builtin module...'));

        names = names.filter((name) => {
            return !!packages[name];
        });
        if (names.length === 0) {
            names = Object.keys(packages);
        }

        await clean();
        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            console.log(`${name} - reinstall`);
            await uninstall(name);
            await install(packages[name]);
            console.log(`${name} - success`);
        }

        if (onlyModule) {
            return;
        }
    }

    console.log(chalk.cyanBright('Update editor repo...'));
    await cmd('git', {
        root: path.join(__dirname, '..'),
        args: ['pull'],
    });

    console.log(chalk.cyanBright('Update 3d engine repo...'));
    await cmd('git', {
        root: path.join(__dirname, '../resources/3d/engine'),
        args: ['pull'],
    });

    console.log(chalk.cyanBright('Update 2d engine repo...'));
    await cmd('git', {
        root: path.join(__dirname, '../resources/2d/engine'),
        args: ['pull'],
    });
};

update().catch((error) => {
    console.log(`exec error: ${error}`);
});
