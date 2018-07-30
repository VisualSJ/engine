'use strict';

const ps = require('path');
const http = require('http');
const fse = require('fs-extra');

const files = [
    {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/engine.dev.js',
        dist: './builtin/scene/engine/engine.dev.js',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/button.js',
        dist: './.project/assets/button.scene',
    }, {
        url: 'http://192.168.52.109/TestBuilds/Editor-3d/resources/slider.js',
        dist: './.project/assets/slider.scene',
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

            let string = '';

            res.on('data', (chunk) => {
                string += chunk;
            });

            res.on('end', () => {
                fse.outputFileSync(item.dist, string);
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