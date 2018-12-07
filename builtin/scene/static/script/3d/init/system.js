'use stirct';

const camera = require('../manager/camera').EditorCamera;
const gizmos = require('../../public/gizmos');

/**
 * 初始化编辑器内使用的 camera
 */
module.exports = async function() {
    await camera.init();
    await gizmos.init();
};
