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
workflow.task('copy-license', tasks.copyLicense)
workflow.task('copy-resources', tasks.copyResources);

// 清空无用文件
workflow.task('clean-builtin', tasks.clearBuiltin);

// 压缩 js
workflow.task('uglify-js', tasks.uglifyJs);

// 替换 info.plist 内的数据
workflow.task('replace-info', tasks.replaceInfo);

// 打包 app.asar
workflow.task('asar-pack', tasks.asar);

// 开始打包
workflow.run();
