'use stirct';

const assets = require('../assets');

module.exports = function() {
    var loader = cc.loader;

    function checkImporter(importer, includedImporters, excludedImporters) {
        includedImporters && !Array.isArray(includedImporters) && (includedImporters = [includedImporters]);
        excludedImporters && !Array.isArray(excludedImporters) && (excludedImporters = [excludedImporters]);
        // check if type is in includedTypes
        return (!includedImporters || includedImporters.some((val) => importer === val)) &&
        (!excludedImporters || !excludedImporters.some((val) => importer === val));
    }

    function searchSingleAsset(asset, reg, importer, callback) {
        function searchSubAsset(subAsset) {
            if (checkImporter(subAsset.importer, importer, null)) {
                cc.AssetLibrary.loadAsset(subAsset.uuid, callback);
                return true;
            } else {
                return subAsset.subAssets && Object.values(subAsset.subAssets).some(searchSubAsset);
            }
        }

        if (!reg.test(asset.source)) { return false; }
        if (checkImporter(asset.importer, ['*', 'database'], null)) { return false; }
        return searchSubAsset(asset);
    }

    // overwrite loadRes for editor
    loader.loadRes = async function(url, type, mount, progressCallback, completeCallback) {
        if (!url) { return null; }
        if (arguments.length !== 5) {
            completeCallback = progressCallback;
            progressCallback = mount;
            mount = 'assets';
        }
        mount = mount || 'assets';
        var args = this._parseLoadResArgs(type, progressCallback, completeCallback);
        type = args.type;
        progressCallback = args.onProgress;
        completeCallback = args.onComplete;
        var importer = null;
        type && (importer = assets.getImporter(type));

        url = 'db://' + mount + '/resources' + (url.startsWith('/') ? url : '/' + url);
        var reg = new RegExp('\\b' + url + '\\..+$');
        try {
            const assetInfos = await Manager.Ipc.send('query-assets');
            assetInfos.some((val) => {
                return searchSingleAsset(val, reg, importer, completeCallback);
            }) || completeCallback(null, null);
        } catch (e) {
            const error = new Error('Can not load asset');
            error.errorCode = 'db.NOTFOUND';
            completeCallback(error);
        }

    };

    // overwrite loadResArray for editor
    loader.loadResArray = async function(urls, type, mount, progressCallback, completeCallback) {
        if (!urls || urls.length === 0) { return null; }
        if (arguments.length !== 5) {
            completeCallback = progressCallback;
            progressCallback = mount;
            mount = 'assets';
        }
        mount = mount || 'assets';
        var args = this._parseLoadResArgs(type, progressCallback, completeCallback);
        type = args.type;
        progressCallback = args.onProgress;
        completeCallback = args.onComplete;

        var importer = null;
        type && (importer = assets.getImporter(type));

        var out = [];
        var totalCount = urls.length;
        var completedCount = 0;

        try {
            const assetInfos = await Manager.Ipc.send('query-assets');

            (function next(index) {
                var url = urls[index];
                url = 'db://' + mount + '/resources' + (url.startsWith('/') ? url : '/' + url);
                var reg = new RegExp('\\b' + url + '\\..+$');

                function callback(err, asset) {
                    if (err) {
                        if (completeCallback) { completeCallback(err, null); }
                    } else {
                        completedCount += 1;
                        if (progressCallback) { progressCallback(completedCount, totalCount, asset); }
                        asset && out.push(asset);
                        if (completedCount === totalCount) {
                            completeCallback(err, out);
                        } else {
                            next(completedCount);
                        }
                    }
                }

                assetInfos.some((val) => searchSingleAsset(val, reg, importer, callback)) || callback(null, null);

            })(completedCount);

        } catch (e) {
            const error = new Error('Can not load asset');
            error.errorCode = 'db.NOTFOUND';
            completeCallback(error);
        }

    };

    // overwrite loadResDir for editor
    loader.loadResDir = async function(url, type, mount, progressCallback, completeCallback) {
        if (!url) { return null; }
        if (arguments.length !== 5) {
            completeCallback = progressCallback;
            progressCallback = mount;
            mount = 'assets';
        }

        mount = mount || 'assets';

        var args = this._parseLoadResArgs(type, progressCallback, completeCallback);
        type = args.type;
        progressCallback = args.onProgress;
        completeCallback = args.onComplete;

        var importer = null;
        type && (importer = assets.getImporter(type));

        url = 'db://' + mount + '/resources' + (url.startsWith('/') ? url : '/' + url) + (url.endsWith('/') ? '' : '/');
        var reg = new RegExp('\\b' + url + '.+$');
        try {

            const assetInfos = await Manager.Ipc.send('query-assets');
            var uuids = [];
            assetInfos.forEach((val) => {
                if (!reg.test(val.source)) { return false; }
                if (checkImporter(val.importer, importer, ['*', 'database'])) {
                    uuids.push(val.uuid);
                }
            });

            if (uuids.length === 0) { completeCallback(err, []); }
            var out = [];
            var totalCount = uuids.length;
            var completedCount = 0;
            (function next(index) {
                cc.AssetLibrary.loadAsset(uuids[index], function(err, asset) {
                    if (err) {
                        if (completeCallback) { completeCallback(err, null); }
                    } else {
                        completedCount += 1;
                        if (progressCallback) { progressCallback(completedCount, totalCount, asset); }
                        asset && out.push(asset);
                        if (completedCount === totalCount) {
                            completeCallback(err, out);
                        } else {
                            next(completedCount);
                        }
                    }
                });
            })(completedCount);

        } catch (e) {
            const error = new Error('Can not load asset');
            error.errorCode = 'db.NOTFOUND';
            completeCallback(error);
        }
    };
};
