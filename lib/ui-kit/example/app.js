'use strict';

const { join } = require('path');
const panel = require('../index');

const { app, BrowserWindow } = require('electron');

let win;

app.on('ready', () => {
    win = new BrowserWindow({
        x: 200,
        y: 200,
        width: 400,
        height: 500,
    });
    win.loadURL(`file://${__dirname}/index.html`);

});