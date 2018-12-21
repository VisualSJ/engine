'use strict';

const { app } = require('electron');

// 焦点在哪一个窗口上
let focusWin = null;

app.on('browser-window-focus', (event, window) => {
    focusWin = window;
});

app.on('browser-window-blur', (event, window) => {
    if (focusWin === window) {
        focusWin = null;
    }
});

module.exports = {
    get window() {
        return focusWin;
    },
};
