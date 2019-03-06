'use strict';

const ps = require('path'); // path system
const fse = require('fs-extra');

const vWorkflow = require('v-workflow');

const workflow = new vWorkflow({
    name: 'clear-js',
    tmpdir: ps.join(__dirname, '../../.workflow'),
});

/////////////////////////
// 清空 builtin 内的 dist

const builtin = ps.join(__dirname, '../../app/builtin');
fse.readdirSync(builtin).forEach((name) => {
    const dir = ps.join(builtin, name);
    if (!fse.existsSync(ps.join(dir, 'dist'))) {
        return;
    }

    workflow.task(name, async function() {
        fse.removeSync(ps.join(dir, './dist'));
    });
});

const engine = ps.join(__dirname, '../../resources/3d/engine/bin/.cache');
workflow.task('clear-engine-dev', async function() {
    fse.removeSync(engine);
});

workflow.task('clear-workflow', async function() {
    fse.removeSync(ps.join(__dirname, '../../.workflow/build-js.json'));
    fse.removeSync(ps.join(__dirname, '../../.workflow/build-css.json'));
});

workflow.run();
