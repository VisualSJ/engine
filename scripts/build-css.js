'use strict';

const ps = require('path'); // path system
let exec = require('child_process').exec;

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

    return new Promise((resolve, reject) => {
        exec('lessc ./static/style/index.less ./dist/index.css', {
            cwd: dir,
        }, (error) => {
            if (error) {
                console.log(`exec error: ${error}`);
                return reject(error);
            }

            resolve();
        });
    });
})).catch((error) => {
    console.log(`exec error: ${error}`);
});