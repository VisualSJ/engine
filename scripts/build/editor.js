'use strict';

const fse = require('fs-extra');
const path = require('path');
const ping = require('ping');

const vWorkflow = require('v-workflow');

const APP = path.join(__dirname, '../../app');

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const workflow = new vWorkflow({
    name: 'build-editor',
    tmpdir: path.join(__dirname, '../../.workflow'),
});

const PATH = {
    modules: path.join(APP, 'node_modules'),
    temp: path.join(__dirname, '../../.workflow/build-editor'),
};

// 检查是否需要 npm install
workflow.task('npm-install', async function() {
    const json = path.join(APP, 'package.json');

    if (!fse.existsSync(json)) {
        throw new Error('app 目录下没有找到 package.json 文件');
    }

    const mtime = fse.statSync(json).mtime.getTime();

    // 如果 package.json 没有修改，且 node_modules 存在，则跳过这次安装
    if (mtime === this.get('npm-install') && fse.existsSync(path.join(APP, 'node_modules'))) {
        return false;
    }

    // 是否跳过内网模块包的安装
    let production = false;

    // 检查是否能连通服务器
    const network = await new Promise((resolve) => {
        ping.sys.probe('192.168.52.110', function(isAlive){
            resolve(isAlive);
        });
    });

    // 如果联系不上服务器，尝试使用备份模块，如果没有备份模块，提示警告
    if (!network) {
        production = true;
        console.warn('\n无法联通内网服务器，将尝试使用备份模块\n');

        if (
            !fse.existsSync(path.join(PATH.temp, '@base')) ||
            !fse.existsSync(path.join(PATH.temp, '@editor'))
        ) {
            console.error('\n备份不存在，将跳过模块安装，这将有可能导致编辑器无法运行\n');
        } else {
            fse.removeSync(path.join(PATH.modules, '@base'));
            fse.removeSync(path.join(PATH.modules, '@editor'));
            fse.copySync(path.join(PATH.temp, '@base'), path.join(PATH.modules, '@base'));
            fse.copySync(path.join(PATH.temp, '@editor'), path.join(PATH.modules, '@editor'));
        }
    }

    await workflow.bash(command, {
        params: ['install', production ? '--production' : ''],
        root: APP,
    });

    // 如果可以联通内网，安装完成后需要备份
    if (network) {
        fse.emptyDirSync(PATH.temp);

        fse.copySync(path.join(PATH.modules, '@base'), path.join(PATH.temp, '@base'));
        fse.copySync(path.join(PATH.modules, '@editor'), path.join(PATH.temp, '@editor'));
    }

    // 如果用的备份，则下次必须重新安装，不记录缓存数据
    this.set('npm-install', network ? mtime : 0);
});

workflow.run();
