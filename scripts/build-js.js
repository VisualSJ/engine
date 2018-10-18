'use strict';

const ps = require('path'); // path system
let exec = require('child_process').exec;

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
];

Promise.all(tsDirnames.map((dir) => {
    dir = ps.join(__dirname, '..', dir);

    return new Promise((resolve, reject) => {
        exec(process.platform === 'win32' ? 'tsc.cmd' : 'tsc', {
            cwd: dir,
            stdio: 'inherit',
        }, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec db error: ${error}`);
                console.error(`  ${dir}`);
                return reject(error);
            }

            resolve();
        });
    });
})).catch((error) => {
    console.log(`exec js  error: ${error}`);
});
