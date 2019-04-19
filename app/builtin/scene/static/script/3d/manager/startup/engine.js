'use strict';

const ipc = require('../ipc');
const effects = require('../effects');
const scripts = require('../scripts');

/**
 * 将引擎文件 require 到当前进程
 * @param {*} path
 */
function requireEngine(path) {
    try {
        require(path + '/bin/.cache/dev');
    } catch (error) {
        console.log(`Load engine failed: ${error.message}`);
        throw error;
    }
}

/**
 * 启动引擎前的引擎配置修改
 */
function configureStartup() {
    // canvas 透明度修改
    cc.macro.ENABLE_TRANSPARENT_CANVAS = true;
    // 模拟
    cc.registerModuleFunc = function() { };
}

/**
 * 打开引擎（运行引擎）
 */
async function openEngine() {
    await new Promise((resolve) => {
        cc.game.run({
            id: 'GameCanvas',
            showFPS: false,
            debugMode: cc.debug.DebugMode.WARN,
            frameRate: 60,
            renderMode: 2, // 0: auto, 1:Canvas, 2:Webgl
            registerSystemEvent: false,
            jsList: [],
            noCache: true,
            groupList: [],
            collisionMatrix: null,
        }, resolve);
    });

    // 如果不设置宽高，会导致网格、gizmo 部分线条出现锯齿
    const bcr = document.body.getBoundingClientRect();
    cc.view.setCanvasSize(bcr.width, bcr.height);
}

/**
 * 引擎启动之后配置引擎运行的某些参数
 */
function configureEngine() {
    cc.view.enableRetina(false);
    cc.game.canvas.style.imageRendering = 'pixelated';
    cc.game.canvas.setAttribute('tabindex', -1);
    cc.game.canvas.style.backgroundColor = '';
}

/**
 * 引擎启动前加载现在所有的 effects
 */
async function loadEffect() {
    const uuids = await ipc.send('query-effects');
    await Promise.all(
        uuids.map((uuid) => {
            return effects.registerEffect(uuid);
        })
    );
}

/**
 * 场景打开前，需要加载所有的脚本
 */
async function loadScript() {
    const uuids = await ipc.send('query-scripts');
    await Promise.all(
        uuids.map((uuid) => {
            return scripts.loadScript(uuid);
        })
    );
}

exports.requireEngine = requireEngine;
exports.configureStartup = configureStartup;
exports.openEngine = openEngine;
exports.configureEngine = configureEngine;
exports.loadEffect = loadEffect;
exports.loadScript = loadScript;
