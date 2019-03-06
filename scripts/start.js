'use strict';

let spawn = require('child_process').spawn;
let args = process.argv.slice(2);

let command;
let options;

if (process.platform === 'darwin') {
    command = './node_modules/.bin/electron';
} else if (process.platform === 'win32') {
    // windows 上直接使用 electron.cmd 启动不了
    command = './node_modules/electron/dist/electron.exe';
}

// 拼接 dev 参数
options = ['./app', '--dev'].concat(args);

spawn(command, options, {
  stdio: 'inherit',
});
