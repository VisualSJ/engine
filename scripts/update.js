'use strict';

const cp = require('child_process');
const chalk = require('chalk');
const path = require('path');
const exec = require('child_process').exec;

/**
 * 执行一个控制台命令
 * @param {*} cmd
 * @param {*} options
 */
function cmd(cmd, options) {
    return new Promise((resolve, reject) => {
        cmd = (options.rawCmd) || (process.platform !== 'win32') ? cmd : `${cmd}.cmd`;
        let child = cp.spawn(cmd, options.args, {
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

    console.log(chalk.cyanBright('Update editor repo...'));
    await cmd('git', {
        root: path.join(__dirname, '..'),
        args: ['pull'],
        rawCmd: true,
    });

    console.log(chalk.cyanBright('Update 3d engine repo...'));
    await cmd('git', {
        root: path.join(__dirname, '../resources/3d/engine'),
        args: ['pull'],
        rawCmd: true,
    });

    console.log(chalk.cyanBright('Update 2d engine repo...'));
    await cmd('git', {
        root: path.join(__dirname, '../resources/2d/engine'),
        args: ['pull'],
        rawCmd: true,
    });
};

update().catch((error) => {
    console.log(`exec error: ${error}`);
});
