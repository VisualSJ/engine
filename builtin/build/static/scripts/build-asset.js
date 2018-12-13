const buildResult = require('./build-result');
const platfomConfig = require('./platforms-config');
const {requestToPackage, getDestPathNoExt, updateProgress} = require('./utils');
const {outputFileSync, readJSONSync, copyFile, ensureDirSync} = require('fs-extra');
const {join, dirname, extname} = require('path');

class AssetBuilder {
    init() {
        this.paths = buildResult.paths;
        this.options = buildResult.options;

        let platformInfo = platfomConfig[this.options.platform];
        this.isJSB = platformInfo.isNative;
        this.exportSimpleFormat = !platformInfo.stripDefaultValues || platformInfo.exportSimpleProject;
        this.shouldExportScript = !platformInfo.exportSimpleProject;
        this.initFlag = true;
        this.copyPaths = [];
    }

    build(rawAssets, scenes) {
        return new Promise(async (resolve, reject) => {
            updateProgress('build assets...');
            this.init();
            for (let item of scenes) {
                await this.buildAsset(item.uuid);
            }
            for (let key of Object.keys(rawAssets)) {
                let assets = rawAssets[key];
                if (key === 'internal') {
                    console.log('internal');
                }
                for (let uuid of Object.keys(assets)) {
                    await this.buildAsset(uuid);
                }
            }
            Promise.all(this.copyPaths.map((paths) => {
                return new Promise((resolve, reject) => {
                    copyFile(paths.src, paths.dest, (error) => {
                        if (error) {
                            reject(error);
                        }
                        resolve();
                    });
                });
            })).then(() => {
                updateProgress('build assets success', 30);
                resolve();
            }).catch((error) => {
                reject(error);
                console.log(`copy asset error: ${error}`);
            });
        });
    }

    async buildAsset(uuid) {
        let library = await requestToPackage('asset-db', 'query-asset-library', uuid);
        const json = readJSONSync(library['.json']);
        let detail = new cc.deserialize.Details();
        let asset = cc.deserialize(json, detail, {
            ignoreEditorOnly: true,
        });
        asset._uuid = uuid;
        this.compress(asset);
    }

    // 压缩构建
    async compress(asset) {
        var nativeAssetEnabled = asset._native &&
        (this.isJSB ||
            !asset.constructor.preventPreloadNativeObject ||
            asset instanceof ALWAYS_INCLUDE_RAW_FILES

        );
        // output
        let nativePath;
        if (nativeAssetEnabled) {
            nativePath = await this._exportNativeAsset(asset);
        }
        // compress
        let contentJson = Manager.serialize(asset, {
            exporting: true,
            nicify: !this.exportSimpleFormat,
            stringify: false,
            dontStripDefault: this.exportSimpleFormat,
        });
        outputFileSync(getDestPathNoExt(this.paths.res, asset._uuid) + '.json', JSON.stringify(contentJson));
        return nativePath;
    }

    // 导出原始资源
    async _exportNativeAsset(asset) {
        const RAW_ASSET_DEST = 'raw-assets';

        let assetInfo = await requestToPackage('asset-db', 'query-asset-info', asset._uuid);
        let src = assetInfo.library[extname(assetInfo.source)];
        // var relativePath = relative(join(this.paths.project, 'asset'), asset.nativeUrl);
        var dest = join(this.paths.res, RAW_ASSET_DEST, asset.nativeUrl);
        ensureDirSync(dirname(dest));
        if (asset instanceof cc.Texture2D) {
            let meta = this.uuid2meta[asset._uuid];

            let suffix = [];
            try {
                suffix = await promisify(CompressTexture)({
                    src: src,
                    dst: dest,
                    platform: this.platform,
                    compressOption: meta.platformSettings,
                });
            } catch (err) {
                console.error(err);
            }

            if (suffix.length > 0) {
                asset._exportedExts = suffix;
            }
            return;
        }
        this.copyPaths.push({
            src,
            dest,
        });
    }
}
module.exports = new AssetBuilder();
