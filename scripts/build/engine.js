'use strict';

const fse = require('fs-extra');
const path = require('path');
const vGit = require('v-git');
const vWorkflow = require('v-workflow');

const pkg = require('../../package.json');
const RESOURCE = path.join(__dirname, '../../resources');

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const gulp = process.platform === 'win32' ? 'gulp.cmd' : 'gulp';

const workflow = new vWorkflow({
    name: 'build-engine',
    tmpdir: path.join(__dirname, '../../.workflow'),
});

// 检查文件夹是否存在
workflow.task('check-directory', async function() {
    const dir = path.join(RESOURCE, '3d');
    if (fse.existsSync(dir)) {
        return false;
    }
    fse.ensureDirSync(dir);
});

// 检查是否需要 clone 引擎仓库
workflow.task('clone-engine', async function() {
    const dir = path.join(RESOURCE, '3d');
    const engine = path.join(dir, 'engine');
    if (fse.existsSync(engine)) {
        return false;
    }
    vGit.config.stdio = [0, 1, 2];
    await vGit.clone(
        dir,
        'https://github.com/cocos-creator/engine.git'
    );

    const repo = await vGit.init(engine);

    // 如果本地有 3d 分支，则切换到本地 3d 分支，没有的话创建 3d 分支
    if (repo.branchList.indexOf(pkg.branch.engine) === -1) {
        await repo.createBranch(pkg.branch.engine, `origin/${pkg.branch.engine}`);
    } else {
        await repo.switchBranch(pkg.branch.engine);
    }
});

// 检查是否需要 npm install
workflow.task('npm-install', async function() {
    const dir = path.join(RESOURCE, '3d');
    const engine = path.join(dir, 'engine');
    const json = path.join(engine, 'package.json');

    if (!fse.existsSync(json)) {
        throw new Error('app 目录下没有找到 package.json 文件');
    }

    const mtime = fse.statSync(json).mtime.getTime();

    if (mtime === this.get('npm-install') && fse.existsSync(engine, 'node_modules')) {
        return false;
    }

    await workflow.bash(command, {
        params: ['install'],
        root: engine,
    });
    this.set('npm-install', mtime);
});

// 检查是否需要构建引擎的 debug 信息以及引擎
workflow.task('build-engine', async function() {
    const dir = path.join(RESOURCE, '3d');
    const engine = path.join(dir, 'engine');
    const mtime = fse.statSync(engine).mtime.getTime();

    // todo 这里应该用 git head 判断
    if (mtime === this.get('build-debug')) {
        return false;
    }
    await workflow.bash(gulp, {
        params: ['build-debug-infos'],
        root: engine,
    });
    await workflow.bash(command, {
        params: ['run', 'build'],
        root: engine,
    });
    this.set('build-debug', mtime);
});

workflow.run();
