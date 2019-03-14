'use strict';

const ps = require('path');
const chalk = require('chalk');
const pkg = require('../package.json');

const vWorkflow = require('v-workflow');

const workflow = new vWorkflow({
    name: `init`,
    tmpdir: ps.join(__dirname, '../../.workflow'),
});

// 打包 app.asar
workflow.task('Check the engine', async function() {

    console.log(chalk.yellowBright('\n\n此命令只会尝试切换到本地指定分支，并拉取代码\n并不会处理代码冲突与自动合并\n如果遇到报错警告，可能需要使用第三方工具进行解决'));

    console.log(chalk.green('\n添加远程地址'));
    try {
        await this.bash('git', {
            params: ['remote', 'add', 'cocos-for-editor', 'https://github.com/cocos-creator/engine.git'],
            root: ps.join(__dirname, '../resources/3d/engine'),
        });
    } catch(error) {}

    console.log(chalk.green('\n获取远程分支数据'));
    try {
        await this.bash('git', {
            params: ['fetch', 'cocos-for-editor'],
            root: ps.join(__dirname, '../resources/3d/engine'),
        });
    } catch(error) {}

    console.log(chalk.green('\n从远程切出分支'));
    try {
        await this.bash('git', {
            params: ['checkout', '-b', pkg.branch.engine, `cocos-for-editor/${pkg.branch.engine}`],
            root: ps.join(__dirname, '../resources/3d/engine'),
        });
    } catch(error) {}

    console.log(chalk.green('\n当前本分支切换'));
    try {
        await this.bash('git', {
            params: ['checkout', pkg.branch.engine],
            root: ps.join(__dirname, '../resources/3d/engine'),
        });
    } catch(error) {}

    console.log(chalk.green('\n更新当前分支\n'));
    try {
        await this.bash('git', {
            params: ['pull'],
            root: ps.join(__dirname, '../resources/3d/engine'),
        });
    } catch(error) {}
});

// 开始打包fetch 
workflow.run();
