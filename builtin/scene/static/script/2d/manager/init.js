'use stirct';

///////////////
// 初始化管理器

const { basename } = require('path');
const assets = require('../assets');

/**
 * 初始化引擎
 * @param {*} path 引擎路径
 */
async function engine(path) {
    // 防止多次加载引擎
    const id = basename(path, '.js');
    if (document.getElementById(id)) {
        return;
    }

    // 创建引擎脚本对象
    const script = document.createElement('script');
    script.id = id;
    script.src = `file://${path}`;
    document.body.appendChild(script);

    // 等待脚本加载完成
    await new Promise((resolve) => {
        script.addEventListener('load', () => {
            resolve();
        });
    });

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

    // 启动引擎
    const option = {
        id: 'GameCanvas',
        debugMode: cc.debug.DebugMode.INFO,
        showFPS: false,
        frameRate: 60,
    };

    // 等待引擎启动
    await new Promise((resolve) => {
        cc.game.run(option, resolve);
    });

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
}

module.exports = {
    engine,
    utils,
};
