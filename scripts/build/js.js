'use strict';

const ps = require('path'); // path system
const fse = require('fs-extra');

const vWorkflow = require('v-workflow');

const workflow = new vWorkflow({
    name: 'build-js',
    tmpdir: ps.join(__dirname, '../../.workflow'),
});

/////////////////////////
// 编译 typescript

const builtin = ps.join(__dirname, '../../app/builtin');
fse.readdirSync(builtin).forEach((name) => {
    const dir = ps.join(builtin, name);
    if (!fse.existsSync(ps.join(dir, 'tsconfig.json'))) {
        return;
    }

    workflow.task(name, async function() {
        const sourceDir = ps.join(dir, './source');
        const cache = this.get(name) || {};
        let changed = false;
        workflow.recursive(sourceDir, (file) => {
            const mtime = fse.statSync(file).mtime.getTime();
            if (cache[file] !== mtime) {
                changed = true;
                cache[file] = mtime;
            }
        });

        if (!changed) {
            return false;
        }
        const cmd = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
        await this.bash(cmd, {
            root: dir,
        });
        this.set(name, cache);
    });
});

workflow.run();
