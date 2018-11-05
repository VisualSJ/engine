'use strict';

const assets = require('../assets');

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

    if (!info.compile) {
        // 加载单文件引擎
        require(info.path);
    } else {
        // 加载多文件引擎
        require(info.path + '/bin/.cache/dev');
    }

    // 设置（HACK）资源目录地址
    let dirname = 'import://';
    cc.AssetLibrary.init({
        libraryPath: dirname,
    });
    cc.url._rawAssets = dirname;
    cc.game.config = {};

    cc.AssetLibrary.queryAssetInfo = async function(uuid, callback) {

        const info = await Manager.Ipc.send('query-asset-info', uuid);
        let url = info.files[0]
            .replace(/^\S+(\/|\\)library(\/|\\)/, '')
            .replace(/\.[^\.]+$/, '.json');

        callback(null, `import://${url}`, false, assets.getCtor(info.importer));
    };

    // canvas 透明模式
    cc.macro.ENABLE_TRANSPARENT_CANVAS = true;

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
    };

    // 等待引擎启动
    await new Promise((resolve) => {
        cc.game.run(option, resolve);
    });

    cc.view.enableRetina(false);
    cc.game.canvas.style.imageRendering = 'pixelated';
    // cc.view.setDesignResolutionSize(options.designWidth, options.designHeight, cc.ResolutionPolicy.SHOW_ALL);
    // cc.view.setCanvasSize(config.width, config.height);

    cc.game.canvas.setAttribute('tabindex', -1);
    cc.game.canvas.style.backgroundColor = '';

    await new Promise((resolve) => {
        setTimeout(resolve, 100);
    });
};
