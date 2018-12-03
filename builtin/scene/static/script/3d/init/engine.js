'use strict';

const builtinEffectUUIDs = [
    '0b811dd2-5afa-4b59-b6d0-aa8dce16e866', // font
    '9d6c6bde-2fe2-44ee-883b-909608948b04', // gizmo
    'ba35f02e-a81c-464c-bfc5-c788328da667', // grid
    'db39ed5b-5f3a-418c-a651-1bb81d52e5bf', // line
    '6b88f733-3145-4918-9a17-9dcc08a4731c', // matcap
    '40a23fc7-e4cc-49e9-a090-7bbefb53d640', // particle-add
    '6034b748-b2e7-4964-bbf7-48ec5bf0b0f0', // particle-add-gpu
    '45b39920-b631-4184-bbd9-6fca4c0deb68', // particle-add-multiply
    '74af64eb-ea67-4e03-95c0-1b1a82ad98d5', // particle-add-smooth
    'a981f08b-6384-4e5a-b99b-8e40e8f64b66', // particle-alpha-blend
    '105826dc-53dc-4df7-96e9-06621f7f71fe', // particle-premultiply-blend
    'e84e3815-d4ad-4777-a70c-a59f8425d4c1', // pbr
    '75b49552-f461-40f0-bab8-398e6b92cc11', // pbr-transparent
    '0504e5ab-d2a3-4c79-bba0-2aed51da577e', // phong
    'cd2075f2-302c-4d7d-a3b0-e040962b74af', // phong-transparent
    'e09ed47e-55d8-45b2-b397-603c9a44f321', // simple
    '61dc99a5-5489-44c9-9812-fd772d1c5a42', // skybox
    '60f7195c-ec2a-45eb-ba94-8955f60e81d0', // sprite
    'a3cd009f-0ab0-420d-9278-b9fdab939bbc', // unlit
    '247f98d6-0458-461c-b200-ab0204ca2aaa', // unlit-transparent
    '186cbbce-9002-4374-b9aa-d9d94fb4c9a3', // wireframe
];

let inited = false;

/**
 * 初始化引擎
 * @param {*} info 引擎信息
 */
module.exports = async function(info) {
    if (inited) {
        return;
    }
    inited = true;
    // 加载多文件引擎
    require(info.path + '/bin/.cache/dev');

    // canvas 透明模式
    cc.macro.ENABLE_TRANSPARENT_CANVAS = true;

    cc.registerModuleFunc = function() {};

    // 启动引擎
    const option = {
        id: 'GameCanvas',
        showFPS: false,
        debugMode: cc.debug.DebugMode.ERROR,
        frameRate: 60,
        renderMode: 2, // 0: auto, 1:Canvas, 2:Webgl
        registerSystemEvent: false,
        jsList: [],
        noCache: false,
        groupList: [],
        collisionMatrix: null,
        effects: builtinEffectUUIDs,
    };
    // todo
    // 重写引擎内的资源相关函数
    await require('./assets')();

    // 等待引擎启动
    await new Promise((resolve) => {
        cc.game.run(option, resolve);
    });

    cc.view.enableRetina(false);
    cc.game.canvas.style.imageRendering = 'pixelated';

    cc.game.canvas.setAttribute('tabindex', -1);
    cc.game.canvas.style.backgroundColor = '';

    await new Promise((resolve) => {
        setTimeout(resolve, 100);
    });
};
