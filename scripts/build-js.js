'use strict';

const ps = require('path'); // path system
const fse = require('fs-extra');

const vWorkflow = require('./workflow');

const workflow = new vWorkflow({
    name: 'build-js',
    tmpdir: ps.join(__dirname, '../.workflow'),
});

/////////////////////////
// 编译 typescript

let tsDirnames = [
    './builtin/asset-db',
    './builtin/assets',
    './builtin/console',
    './builtin/engine',
    './builtin/hierarchy',
    './builtin/inspector',
    './builtin/preferences',
    './builtin/scene',
    './builtin/selection',
    './builtin/ui-preview',
    './builtin/package-manager',
    './builtin/project-setting',
    './builtin/preview',
    './builtin/build',
];

tsDirnames.forEach((path) => {
    const searchPaths = path.split('/');
    const name = searchPaths.pop();
    workflow.task(name, async function() {
        const dir = ps.join(__dirname, '..', path);

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
