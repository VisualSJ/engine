'use strict';

const wins = require('@base/electron-windows');
const $panel = document.getElementById('panel');
$panel.setAttribute('name', wins.userData.panel);

window.__MAIN__ = false;

require('../../../task');

requestAnimationFrame(() => {
    window.Editor = require('../../../editor');
    Editor.Task.sync();
});
