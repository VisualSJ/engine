'use strict';

const fse = require('fs-extra');
const spawn = require('child_process').spawn;

const moduleDirnames = [
    './node_modules/sharp',
];

let pkg = fse.readJSONSync('./node_modules/electron/package.json');

(async () => {
    for (let i=0; i<moduleDirnames.length; i++) {
        let moduleDirname = moduleDirnames[i];

        console.log();
        await new Promise((resolve) => {
            const cmd = process.platform === 'win32' ? 'electron-rebuild.cmd' : 'electron-rebuild';
            const options = [
                '--version', pkg.version,
                '--module-dir', moduleDirname,
                '--arch', 'x64',
                '--force',
                '--sequential',
            ];

            const child = spawn(cmd, options, {
                stdio: 'inherit',
            });

            child.on('exit', resolve);
        });
    }
})();