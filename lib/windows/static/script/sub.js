'use strict';

window.__MAIN__ = false;

require('../../../task');

requestAnimationFrame(() => {
    window.Editor = require('../../../editor');
    Editor.Task.sync();
});
