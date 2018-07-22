'use strict';

let spawn = require('child_process').spawn;
let args = process.argv.slice(2);

let command, options;

if (process.platform === 'darwin') {
    command = './node_modules/.bin/electron';
} else if (process.platform === 'win32') {
    command = './node_modules/.bin/electron.cmd';
}
options = ['./', '--dev'].concat(args);

spawn(command, options, {
  stdio: 'inherit'
});
