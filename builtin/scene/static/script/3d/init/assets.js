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

        try {
            const info = await Manager.Ipc.send('query-asset-info', uuid);
            const lib = 'library';
            const filepath = info.library['.json'];
            const url = filepath.substr(filepath.lastIndexOf(lib) + lib.length + 1).replace(/\\/g, '/');

            callback(null, `import://${url}`, false, assets.getCtor(info.importer));
        } catch (e) {
            const error = new Error('Can not get asset url by uuid "' + uuid + '", the asset may be deleted.');
            error.errorCode = 'db.NOTFOUND';
            callback(error);
        }
    };
};
