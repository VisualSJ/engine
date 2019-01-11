'use strict';

const ps = require('path');
const fse = require('fs-extra');

const vWorkflow = require('./workflow');

const workflow = new vWorkflow({
    name: 'build-npm',
    tmpdir: ps.join(__dirname, '../.workflow'),
});

const moduleDirnames = [
    'robotjs',
];

const pkg = fse.readJSONSync('./node_modules/electron/package.json');
const cmd = process.platform === 'win32' ? 'node-gyp.cmd' : 'node-gyp';

moduleDirnames.forEach((name) => {
    workflow.task(name, async function() {
        await this.bash(cmd, {
            params: [
                'rebuild',
                '--runtime=electron',
                `--target=${pkg.version}`,
                '--disturl=https://atom.io/download/atom-shell',
                '--abi=64',
            ],
            root: ps.join(__dirname, '../node_modules', name),
        });
    });
});

workflow.run();
