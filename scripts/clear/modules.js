'use strict';

const ps = require('path'); // path system
const fse = require('fs-extra');

const vWorkflow = require('v-workflow');

const workflow = new vWorkflow({
    name: 'clear-node-modules',
    tmpdir: ps.join(__dirname, '../../.workflow'),
});

/////////////////////////
// 清空编辑器以及引擎内的第三方 node modules

const app = ps.join(__dirname, '../../app');
const engine = ps.join(__dirname, '../../resources/3d/engine');

workflow.task('editor', function() {
    fse.removeSync(ps.join(app, './node_modules'));
});
workflow.task('engine', function() {
    fse.removeSync(ps.join(engine, './node_modules'));
});

workflow.task('clear-workflow', async function() {
    fse.removeSync(ps.join(__dirname, '../../.workflow/build-editor.json'));
    fse.removeSync(ps.join(__dirname, '../../.workflow/build-engine.json'));
});

workflow.run();
