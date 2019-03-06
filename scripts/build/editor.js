'use strict';

const fse = require('fs-extra');
const path = require('path');

const vWorkflow = require('v-workflow');

const APP = path.join(__dirname, '../../app');

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const workflow = new vWorkflow({
    name: 'build-editor',
    tmpdir: path.join(__dirname, '../../.workflow'),
});

// 检查是否需要 npm install
workflow.task('npm-install', async function() {
    const json = path.join(APP, 'package.json');
    const mtime = fse.statSync(json).mtime.getTime();

    if (mtime === this.get('npm-install')) {
        return false;
    }
    await workflow.bash(command, {
        params: ['install'],
        root: APP,
    });
    this.set('npm-install', mtime);
});

workflow.run();
