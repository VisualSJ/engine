'use strict';

const ps = require('path'); // path system
let exec = require('child_process').exec;
const util = require('util');
const fs = require('fs');
const readDirAsync = util.promisify(fs.readdir);
const fsState = util.promisify(fs.stat);

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

let themeDir = './lib/theme';

// 根据build文件路径，将文件夹内的less文件编译到dist文件下，目录结构不变
readFiles(ps.join(__dirname, '..', themeDir, './build'));

// 根据路径读取文件夹，获取less路径
async function readFiles(stylePath) {
    let fileNames = await readDirAsync(stylePath);
    for (let fileName of fileNames) {
        let fileDir = ps.join(stylePath, fileName);
        let status = await fsState(fileDir);
        if (status.isFile()) {//判断是文件
            if (ps.extname(fileName) === '.less') {
                // 获取less文件夹后，调用函数处理路径进行编译
                compile(fileDir);
            } else if (status.isDirectory()) {//判断是文件夹
                // 若读取到文件夹，则进入该文件夹，重复此函数
                readFiles(fileDir);
            }
        }else {
            // 若读取到文件夹，则进入该文件夹，重复此函数
            readFiles(fileDir);
        }
    }
}

/**
 * 根据less文件路径，进行编译处理
 * @param {path} fileDir 
 */
function compile (fileDir) {
    // 验证文件夹路径是否符合要求
    let isRightDir = fileDir.match(/build([a-z]||[\\]||[-])*.less$/g);
    if (!isRightDir) {
        return;
    }
    // 处理路径字符，生成对应的command命令
    let computDir = (isRightDir[0]).replace(/\\/g,'/');
    let command = `lessc ./${computDir} ./${(computDir.replace('build', 'dist')).replace('.less', '.css')}`;
    // 根据命令与文件夹路径编译less为css到指定的文件夹
    exec(command, {
        cwd:themeDir
    },  (error) => {
        if (error) {
            console.log(`exec theme error: ${error}`);
        }
    })
}