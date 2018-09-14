'use strict';

const ps = require('path');
const http = require('http');
const fse = require('fs-extra');

const files = [
    {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/3d-engine/0.15.0.js',
        dist: './builtin/engine/resources/3d/0.15.0.js',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/2d-engine/2.0.0-alpha.js',
        dist: './builtin/engine/resources/2d/2.0.0-alpha.js',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/button.js',
        dist: './.project/assets/button.scene',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/slider.js',
        dist: './.project/assets/slider.scene',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/123.js',
        dist: './.project-2d/assets/123.scene',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/123.meta.js',
        dist: './.project-2d/assets/123.scene.meta',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/texture.png',
        dist: './.project-2d/assets/texture.png',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/texture.meta.js',
        dist: './.project-2d/assets/texture.png.meta',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/package.js',
        dist: './.project-2d/package.json',
    }
];

// 补全 dist 地址
files.forEach((item) => {
    item.dist = ps.join(__dirname, '../', item.dist);
});

let download = function (item) {
    return new Promise((resolve, reject) => {

        http.get(item.url, (res) => {
            console.log(`正在下载: ${item.url} ...`);

            let buffer;

            res.on('data', (chunk) => {
                if (!buffer) {
                    return buffer = chunk;
                }
                buffer = Buffer.concat([buffer, chunk], buffer.length + chunk.length);
            });

            res.on('end', () => {
                fse.outputFileSync(item.dist, buffer);
                resolve();
            });

            res.on('error', (error) => {
                console.error(error);
                reject(error);
            });
        });
    });
};

let start = async function () {

    for (let i=0; i<files.length; i++) {
        let item = files[i];
        await download(item);
    }
};

start();