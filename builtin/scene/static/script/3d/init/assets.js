'use stirct';

const assets = require('../assets');

/**
 * 资源相关功能的 hack 以及初始化
 */
module.exports = function() {
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
};
