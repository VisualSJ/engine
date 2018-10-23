'use stirct';

///////////////
// 初始化管理器

const assets = require('../assets');
const camera = require('./camera');

let inited = false;

/**
 * 初始化引擎
 * @param {*} path 引擎路径
 */
async function engine(info) {
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
            .replace(/\.\S+$/, '.json');

        callback(null, `import://${url}`, false, assets.getCtor(info.importer));
    };

    // canvas 透明模式
    cc.macro.ENABLE_TRANSPARENT_CANVAS = true;

    // 启动引擎
    const option = {
        id: 'GameCanvas',
        showFPS: false,
        debugMode: cc.debug.DebugMode.ERROR_FOR_WEB_PAGE,
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
}

/**
 * 初始化一些引擎的工具函数
 * @param {*} path
 */
function utils(path) {
    // 序列化
    Manager._serialize = function() {
        return require(path + '/serialize');
    };

    // 错误处理
    cc.error = function(...args) {
        console.error(...args);
    };

    // 打印日志
    cc.log = function(...args) {
        console.log(...args);
    };

    // 警告处理
    cc.warn = function(...args) {
        console.warn(...args);
    };
}

/**
 * 初始化编辑器内使用的 camera
 */
async function system() {
    require('../polyfills');
    await camera.init();
}

module.exports = {
    engine,
    utils,
    system,
};
