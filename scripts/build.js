'use strict';

const ps = require('path'); // path system
let spawn = require('child_process').spawn;

/////////////////////////
// 1. 编译 typescript

let tsDirnames = [
    './builtin/asset-db',
    './builtin/assets',
    './builtin/console',
    './builtin/hierarchy',
    './builtin/inspector',
    './builtin/preferences',
    './builtin/scene',
    './builtin/selection',
];

Promise.all(tsDirnames.map((dir) => {
    dir = ps.join(__dirname, '..', dir);

    return new Promise((resolve) => {
        let child = spawn('tsc', {
            cwd: dir,
        });
        child.on('error', (error) => {
            console.error(error);
        });
        child.on('exit', resolve);
    });
}));

/////////////////////////
// 2. 编译 less
