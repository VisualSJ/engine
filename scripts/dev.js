'use strict';

const ProgressBar = require('progress');
const chalk = require('chalk');
const fse = require('fs-extra');
const path = require('path');
const vGit = require('v-git');
const cp = require('child_process');

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const gulp = process.platform === 'win32' ? 'gulp.cmd' : 'gulp';

/**
 * 执行一个控制台命令
 * @param {*} cmd
 * @param {*} options
 */
function cmd(cmd, options) {
    return new Promise((resolve, reject) => {
        let child = cp.spawn(cmd, options.args, {
            stdio: options.stdio || [0, 1, 2],
            cwd: options.root || process.cwd()
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

(async (root) => {
    const progressBar = new ProgressBar(
        `${chalk.magenta('Update Hosts:')} :bar :current/:total`,
        {
            total: 9
        }
    );

    // clone 3d 引擎
    await (async () => {
        console.log(chalk.cyanBright('Builtin 3D engine...'));

        // 保证路径存在
        const dir = path.join(root, '3d');
        const engine = path.join(dir, 'engine');
        fse.ensureDirSync(dir);

        // 如果引擎文件夹不存在，则需要先 clone 对应的仓库
        if (!fse.existsSync(engine)) {
            vGit.config.stdio = [0, 1, 2];
            console.log(' ');
            await vGit.clone(
                dir,
                'https://github.com/cocos-creator/engine.git'
            );
        }

        const repo = await vGit.init(engine);
        console.log(' ');
        vGit.config.stdio = [0, 1, 2];

        // 如果本地有 3d 分支，则切换到本地 3d 分支，没有的话创建 3d 分支
        if (repo.branchList.indexOf('3d') === -1) {
            await repo.createBranch('3d', 'origin/3d');
        } else {
            await repo.switchBranch('3d');
        }

        progressBar.tick();
        console.log(' ');

        // 3d 引擎模块安装
        await cmd(command, {
            args: ['install'],
            root: engine
        });
        progressBar.tick();
        console.log(' ');

        // 2d 引擎模块构建 gulp build-debug-infos
        await cmd(gulp, {
            args: ['build-debug-infos'],
            root: engine
        });
        progressBar.tick();
        console.log(' ');

        // 3d 引擎模块还原配置
        await cmd('git', {
            args: ['checkout', '.'],
            root: engine
        });
        progressBar.tick();
        console.log(' ');

        // 3d 引擎模块构建 gulp build-debug-infos
        await cmd(
            process.platform === 'win32' ? 'gulp.cmd' : 'gulp',
            {
                args: ['build-debug-infos'],
                root: engine
            }
        );
        progressBar.tick();
        console.log(' ');

        // 3d 引擎模块构建
        await cmd(command, {
            args: ['run', 'build'],
            root: engine
        });
        progressBar.tick();
        console.log(' ');
    })();

    // clone 2d 引擎
    await (async () => {
        console.log(chalk.cyanBright('Builtin 2D engine...'));

        // 保证路径存在
        const dir = path.join(root, '2d');
        const engine = path.join(dir, 'engine');
        fse.ensureDirSync(dir);

        // 如果引擎文件夹不存在，则需要先从 2d 目录复制仓库
        if (!fse.existsSync(engine)) {
            console.log(' ');
            console.log("Copying into 'engine'...");
            fse.copySync(path.join(root, '3d', 'engine'), engine);
        }

        const repo = await vGit.init(engine);
        console.log(' ');
        vGit.config.stdio = [0, 1, 2];

        // 如果本地有 3d 分支，则切换到本地 master 分支，没有的话创建 master 分支
        if (repo.branchList.indexOf('master') === -1) {
            await repo.createBranch('master', 'origin/master');
        } else {
            await repo.switchBranch('master');
        }

        progressBar.tick();
        console.log(' ');

        // 2d 引擎模块安装
        await cmd(command, {
            args: ['install'],
            root: engine
        });
        progressBar.tick();
        console.log(' ');

        // 2d 引擎模块还原配置
        await cmd('git', {
            args: ['checkout', '.'],
            root: engine
        });
        progressBar.tick();
        console.log(' ');

        // 2d 引擎模块构建 gulp build-debug-infos
        await cmd(gulp, {
            args: ['build-debug-infos'],
            root: engine
        });
        progressBar.tick();
        console.log(' ');
    })();
})(path.join(__dirname, '../resources'));
