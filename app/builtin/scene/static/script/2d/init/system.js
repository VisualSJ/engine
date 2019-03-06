'use stirct';

const camera = require('../manager/camera');

/**
 * 初始化编辑器内使用的 camera
 */
module.exports = async function() {
    require('../polyfills/engine');
    await camera.init();
};
