'use strict';

const ps = require('path');

const vWorkflow = require('v-workflow');
const tasks = require('./tasks');

const workflow = new vWorkflow({
    name: `publish-${process.platform}`,
    tmpdir: ps.join(__dirname, '../../.workflow'),
});

// 检查文件夹状态
workflow.task('generate-electron', tasks.generateElectron);

// 复制具体文件
workflow.task('copy-electron', tasks.copyMacElectron);
workflow.task('copy-files', tasks.copyFiles);
workflow.task('copy-resources', tasks.copyResources);

// 清空无用文件
// workflow.task('clean-builtin', tasks.clearBuiltin);

// 压缩、打包代码
workflow.task('uglify-js', tasks.uglifyJs);
// workflow.task('asar-pack', tasks.asar);

workflow.run();
