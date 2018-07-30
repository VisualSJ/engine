'use strict';

const ps = require('path'); // path system
let spawn = require('child_process').spawn;

/////////////////////////
// 编译 less

let lessDirnames = [
    './builtin/assets',
    './builtin/console',
    './builtin/hierarchy',
    './builtin/inspector',
    './builtin/preferences',
    './builtin/scene',
];

Promise.all(lessDirnames.map(async (dir) => {
    dir = ps.join(__dirname, '..', dir);

    return new Promise((resolve) => {
        let child = spawn('lessc', ['./static/style/index.less', './dist/index.css'], {
            cwd: dir,
        });
        child.on('error', (error) => {
            console.error(error);
        });
        child.on('exit', resolve);
    });
}));