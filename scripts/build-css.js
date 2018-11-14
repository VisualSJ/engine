'use strict';

const ps = require('path'); // path system
const exec = require('child_process').exec;
const fs = require('fs');

/////////////////////////
// 编译 less

let lessDirnames = [
    './builtin/assets',
    './builtin/console',
    './builtin/hierarchy',
    './builtin/inspector',
    './builtin/preferences',
    './builtin/scene',
    './builtin/ui-preview',
    './builtin/package-manager',
    './builtin/project-setting',
    './builtin/engine',
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

/////////////////////////////////////
// 编译 theme 模块的 less 代码

(async () => {
    const dirname = {
        theme: ps.join(__dirname, '../lib/theme'),
        source: ps.join(__dirname, '../lib/theme/source'),
        dist: ps.join(__dirname, '../lib/theme/dist'),
    };

    /**
     * 查询所有的 less 文件
     * @param {*} dirname
     */
    const walk = function(dirname) {
        if (!fs.existsSync(dirname)) {
            console.error(`path is not exists: ${dirname}`);
            return [];
        }

        let files = [];
        let names = fs.readdirSync(dirname);
        names.forEach((name) => {
            let file = ps.join(dirname, name);
            let stat = fs.statSync(file);
            if (stat.isDirectory()) {
                walk(file).forEach((child) => {
                    files.push(child);
                });
                return;
            }

            files.push(file);
        });

        return files;
    };

    // 获得所有的文件列表
    let files = walk(dirname.source);

    // 利用文件列表，生成 promise 任务，并并行执行
    Promise.all(files.map((file) => {
        return new Promise((resolve, reject) => {
            let rPath = ps.relative(dirname.source, file);
            let dPath = ps.join(dirname.dist, rPath).replace('.less', '.css');

            exec(`lessc ${file} ${dPath}`, {
                cwd: dirname.theme,
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
})();
