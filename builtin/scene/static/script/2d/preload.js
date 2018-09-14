'use strict';

const path = require('path');
const ipc = require('../ipc/webview');
const assets = require('./assets');

let isReady = false;
let waitTask = [];
function waitReady() {
    return new Promise((resolve) => {
        if (isReady) {
            return resolve();
        }
        waitTask.push(() => {
            return resolve();
        });
    });
}

// 放到全局, 便于调试
// 不能放到主页面内, 应该避免主页内的全局参数污染
window.Manager = {
    Ipc: ipc,
    Scene: require('./manager/scene'),
    get serialize() {
        return this._serialize();
    },
};

// 初始化指定版本的引擎, 成功后通知 host
ipc.on('init-engine', async (info) => {
    const file = info.path;

    Manager._serialize = function () {
        return require(info.utils + '/serialize');
    }

    // 防止多次加载引擎
    const id = path.basename(file, '.js');
    if (document.getElementById(id)) {
        return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = `file://${file}`;
    document.body.appendChild(script);

    await new Promise((resolve) => {
        script.addEventListener('load', () => {

            // 设置资源目录地址
            let dirname = 'import://';
            cc.AssetLibrary.init({
                libraryPath: dirname,
            });
            cc.url._rawAssets = dirname;
            cc.game.config = {};

            cc.AssetLibrary.queryAssetInfo = async function (uuid, callback) {

                const info = await ipc.send('query-asset-info', uuid).promise();
                let url = info.files[0]
                    .replace(/^\S+\/library\//, '')
                    .replace(/\.\S+$/, '.json');

                callback(null, `import://${url}`, false, assets.getCtor(info.importer));
            };

            cc.error = function (...args) {
                console.error(...args);
            }

            var option = {
                id: 'GameCanvas',
                debugMode: cc.debug.DebugMode.INFO,
                showFPS: false,
                frameRate: 60,
            }
        
            var onStart = function () {
                resolve();
            };

            cc.game.run(option, onStart);

        });
        isReady = true;
        while (waitTask.length > 0) {
            let func = waitTask.shift();
            func();
        }
    });
});

// host 调用 scene 的指定方法
ipc.on('call-method', async (options) => {

    await waitReady();

    const mod = Manager[options.module];

    if (!mod) {
        throw new Error(`Module [${options.module}] does not exist`);
    }

    if (!mod[options.handler]) {
        throw new Error(`Method [${options.handler}] does not exist`);
    }

    return await mod[options.handler](...options.params);
});
