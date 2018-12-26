const buildResult = require('./build-result');
const { updateProgress, requestToPackage, getAssetUrl} = require('./utils');
const platfomConfig = require('./platforms-config');
const {copySync, ensureDirSync, readJSONSync} = require('fs-extra');
const {join, dirname, extname} = require('path');
const lodash = require('lodash'); // 排序、去重
const CompressTexture = require('./texture-compress');
const {promisify} = require('util');
const _ = require('lodash');
class AssetBuilder {
    init(type) {
        buildResult.assetCache = this.assetCache = {}; // 存储资源对应的打包情况,资源打包最开始要清空原来存储的数据
        this.result = {};
        this.hasBuild = {};
        this.shoudBuild = true;
        if (type !== 'build-release') {
            this.shoudBuild = false;
            return;
        }
        // 构建时才需要的参数
        this.compressImgTask = {};
        this.paths = buildResult.paths;
        this.options = buildResult.options;
        let platformInfo = platfomConfig[this.options.platform];
        this.isJSB = platformInfo.isNative;
        this.exportSimpleFormat = !platformInfo.stripDefaultValues || platformInfo.exportSimpleProject;
        this.shouldExportScript = !platformInfo.exportSimpleProject;
        this.copyPaths = [];
    }

    build(scenes, type) {
        return new Promise(async (resolve, reject) => {
            updateProgress('build assets...');
            let startTime = new Date().getTime();
            this.init(type);
            if (!scenes) {
                scenes = await requestToPackage('asset-db', 'query-assets', {
                    type: 'scene',
                });
            }
            for (let item of scenes) {
                this.assetCache[item.uuid] = item;
                buildResult.rootUuids.push(item.uuid);
            }
            this.result.scenes = [];
            console.time('beginBuild');
            await this.beginBuild();
            console.timeEnd('beginBuild');
            await this.resolveAsset();
            // 判断是否需要打包资源
            if (!this.shoudBuild) {
                resolve(this.result);
                return this.result;
            }
            Promise.all([this.copyFiles(), this.compressImgs()])
                    .then(() => {
                        let endTime = new Date().getTime();
                        updateProgress(`build assets success in ${endTime - startTime} ms`, 30);
                        resolve(this.result);
                    }).catch((err) => console.error(err));
        });
    }

    // 整理依赖资源数据
    async resolveAsset() {
        console.time('resolveAsset');
        let assets = {};
        let internal = {};
        for (let uuid of Object.keys(this.assetCache)) {
            let asset = this.assetCache[uuid];
            // 非调试模式下， uuid 需要压缩成短 uuid
            if (this.options && !this.options.debug && this.shoudBuild) {
                uuid = Editor.Utils.UuidUtils.compressUuid(uuid, true);
            }
            if (asset.importer === 'scene') {
                this.result.scenes.push({ url: asset.source, uuid});
                continue;
            }
            // ********************* 资源类型 ********************** //
            // subAssets 资源处理
            if (!asset.source || Object.keys(asset.subAssets).length > 0) {
                if (!asset.source) {
                    asset.source = this.subAssetSource(asset.uuid);
                    if (asset.source.startsWith('db://assets')) {
                        assets[uuid] = [getAssetUrl(asset.source, asset.type), asset.type, 1];
                    } else if (asset.source.startsWith('db://internal')) {
                        internal[uuid] = [getAssetUrl(asset.source, asset.type), asset.type, 1];
                    }
                    buildResult.assetCache[asset.uuid] = asset;
                }
                if (Object.keys(asset.subAssets).length > 0) {
                    for (let subAsset of Object.values(asset.subAssets)) {
                        subAsset.fatherUuid = asset.uuid;
                        buildResult.assetCache[subAsset.uuid] = subAsset;
                        let uuid = subAsset.uuid;
                        if (asset.source.startsWith('db://assets')) {
                            assets[uuid] = [getAssetUrl(asset.source, subAsset.type), subAsset.type, 1];
                        } else if (asset.source.startsWith('db://internal')) {
                            internal[uuid] = [getAssetUrl(asset.source, subAsset.type), subAsset.type, 1];
                        }
                    }
                }
                continue;
            }
            if (asset.source.startsWith('db://assets')) {
                assets[uuid] = [getAssetUrl(asset.source), asset.type];
            } else if (asset.source.startsWith('db://internal')) {
                internal[uuid] = [getAssetUrl(asset.source), asset.type];
            }
        }
        // 对 assets 资源进行排序，否则脚本动态加载贴图时，会贴图不正确
        assets = this.sortObjectBy(assets, 0);
        internal = this.sortObjectBy(internal, 0);
        Object.assign(this.result, {
            rawAssets: {assets, internal},
        });
        console.timeEnd('resolveAsset');
    }

    /**
     * 根据对象中的某一个值来排序
     * @param {*} object
     * @param {*} key
     */
    sortObjectBy(object, key) {
        let tempArry = [];
        let tempObject = {};
        let uuids = Object.keys(object);
        if (uuids.length < 1) {
            return object;
        }
        for (let uuid of uuids) {
            let item = object[uuid];
            tempArry.push({
                uuid,
                source: item[key],
            });
        }
        tempArry = _.sortBy(tempArry, 'source');
        for (let item of tempArry) {
            tempObject[item.uuid] = object[item.uuid];
        }
        return tempObject;
    }

    /**
     * 获取 subAsset 资源的 source 路径
     * @param {*} uuid
     */
    subAssetSource(uuid) {
        const regex = /(.*)@/;
        const result = uuid.match(regex);
        if (!result) {
            return '';
        }
        let fatherUuid = result[1];
        let cache = this.assetCache[fatherUuid].source;
        if (!cache) {
            return this.subAssetSource(fatherUuid);
        }
        return cache;
    }

    beginBuild() {
        return new Promise(async (resolve) => {
            // 查询资源库内位于 resource 文件内的资源
            let assetsList = await requestToPackage('asset-db', 'query-assets', {
                pattern: 'db://assets/resources/**/*',
            });
            for (let asset of assetsList) {
                if (asset.isDirectory || asset.importer === 'database') {
                    continue;
                }
                this.assetCache[asset.uuid] = asset;
                buildResult.rootUuids.push(asset.uuid);
            }
            console.time('buildAsset');
            // 并并执行依赖查找
            Promise.all(Object.keys(this.assetCache).map(async (uuid) => {
                await this.buildAsset(this.assetCache[uuid]);
            })).then(() => {
                console.timeEnd('buildAsset');
                resolve();
            });
        });
    }

    /**
     * 构建资源
     * @param {*} asset
     * @memberof AssetBuilder
     */
    async buildAsset(asset) {
        // 已经构建过的直接返回
        if (this.hasBuild[asset.uuid]) {
            return;
        }
        this.hasBuild[asset.uuid] = true;
        if (!asset.library) {
            asset = await requestToPackage('asset-db', 'query-asset-info', asset.uuid);
            this.assetCache[asset.uuid] = asset;
        }
        let library = this.assetCache[asset.uuid].library ;
        // 不存在对应序列化 json 的资源，不需要去做反序列化操作，例如 fbx
        if (!library['.json']) {
            return;
        }
        const json = readJSONSync(library['.json']);
        const deserializeDetails = new cc.deserialize.Details();
        // deatil 里面的数组分别一一对应，并且指向 asset 依赖资源的对象，不可随意更改/排序
        deserializeDetails.reset();
        let deseriAsset = cc.deserialize(json, deserializeDetails, {
            createAssetRefs: true,
            ignoreEditorOnly: true,
        });
        deseriAsset._uuid = asset.uuid;
        // 预览时只需找出依赖的资源，无需缓存 asset
        if (this.shoudBuild) {
            // 检查以及查找对应资源，并返回给对应 asset 数据
            deserializeDetails.assignAssetsBy((uuid) => {
                var exists = this.assetCache[uuid];
                if (exists === undefined) {
                    exists = true;
                }
                if (exists) {
                    return Editor.serialize.asAsset(uuid);
                } else {
                    // remove deleted asset reference
                    // if is RawAsset, it would also be ignored in serializer
                    return null;
                }
            });
            await this.compress(deseriAsset);
        }
        // 将资源对应的依赖资源加入构建队列，并递归查询依赖
        if (deserializeDetails.uuidList.length > 0) {
            buildResult.uuidDepends[asset.uuid] = deserializeDetails.uuidList;
            for (let uuid of deserializeDetails.uuidList) {
                await this.buildAsset({uuid});
            }
        }
    }

    // 压缩构建
    async compress(asset) {
        var nativeAssetEnabled = asset._native &&
        (this.isJSB || !asset.constructor.preventPreloadNativeObject ||
            asset instanceof ALWAYS_INCLUDE_RAW_FILES);
        // output
        let inCompressTask;
        if (nativeAssetEnabled) {
            inCompressTask = await this._exportNativeAsset(asset);
        }
        // 是需要压缩的资源，对应的 asset 需要做一些数据添加处理，由后续对应的压缩资源函数处理
        if (inCompressTask) {
            return;
        }
        // compress 设置
        let contentJson = Editor.serialize(asset, {
            exporting: !this.options.debug, // 是否是作为正式打包导出的序列化操作
            nicify: !this.exportSimpleFormat,
            stringify: false, // 序列化出来的以 json 字符串形式还是 json 对象显示（ json 对象可以方便调试的时候查看）
            dontStripDefault: this.exportSimpleFormat,
        });
        buildResult.jsonCache[asset._uuid] = contentJson;
    }

    // 导出原始资源
    async _exportNativeAsset(asset) {
        const RAW_ASSET_DEST = 'raw-assets';
        let destBase = join(this.paths.res, RAW_ASSET_DEST);
        ensureDirSync(destBase);
        let assetInfo = await requestToPackage('asset-db', 'query-asset-info', asset._uuid);
        let extName = asset._native || '.json';
        // todo 暂时写死访问不到 source 无法取后缀名，就使用 .json
        if (assetInfo.source) {
            extName = extname(assetInfo.source);
        } else if (assetInfo.library && !(asset instanceof cc.Texture2D)) {
            for (let extname of Object.keys(assetInfo.library)) {
                if (extname === '.json') {
                    continue;
                }
                this.copyPaths.push({
                    src: assetInfo.library[extname],
                    dest: join(this.paths.res, 'import', asset.nativeUrl),
                });
            }
            return;
        }
        let src = assetInfo.library[extName];
        // var relativePath = relative(join(this.paths.project, 'asset'), asset.nativeUrl);
        var dest = join(this.paths.res, RAW_ASSET_DEST, asset.nativeUrl);
        ensureDirSync(dirname(dest));
        if (asset instanceof cc.ImageAsset) {
            // 图片资源设置的压缩参数
            let {platformSettings} = this.assetCache[asset._uuid];
            // hack 临时测试压缩方法使用
            // platformSettings = {
            //     web: {
            //         formats: [{
            //             name: 'webp',
            //             quality: 0.8,
            //         }],
            //     },
            //     default: {
            //         formats: [{
            //             name: 'png',
            //             quality: 0.8,
            //         }],
            //     },
            // };
            if (!platformSettings) {
                // 未设置压缩参数，直接加入到拷贝任务中
                this.copyPaths.push({
                    src,
                    dest,
                });
                return;
            }
            this.compressImgTask[asset._uuid] = {
                src: src,
                dst: dest,
                platform: this.options.platform,
                compressOption: platformSettings || {},
            };
            return;
        }
        this.copyPaths.push({
            src,
            dest,
        });
    }

    /**
     * 执行图片压缩格式转换任务
     * @memberof AssetBuilder
     */
    compressImgs() {
        updateProgress(`build assets : compress image asset ...`);
        if (Object.keys(this.compressImgTask).length < 1) {
            updateProgress(`build assets : copy files sucess !`);
            return;
        }
        return new Promise((resolve) => {
            Promise.all(Object.keys(this.compressImgTask).map(async (uuid) => {
                let options = this.compressImgTask[uuid];
                let suffix = await promisify(CompressTexture)(options);
                let asset = this.assetCache[uuid];
                if (suffix.length > 0) {
                    asset._exportedExts = suffix;
                }
                // compress 设置
                let contentJson = Editor.serialize(asset, {
                    exporting: !this.options.debug, // 是否是作为正式打包导出的序列化操作
                    nicify: !this.exportSimpleFormat,
                    stringify: false, // 序列化出来的以 json 字符串形式还是 json 对象显示（ json 对象可以方便调试的时候查看）
                    dontStripDefault: this.exportSimpleFormat,
                });
                buildResult.jsonCache[asset._uuid] = contentJson;
            })).then(() => {
                updateProgress(`build assets : compress image asset sucess !`);
                resolve();
            }).catch((err) => console.error(err));
        });
    }

    // 并并执行文件拷贝工作
    copyFiles() {
        updateProgress(`build assets : copy files ...`);
        if (this.copyPaths.length < 1) {
            updateProgress(`build assets : copy files sucess !`);
            return;
        }
        return new Promise((resolve) => {
            // 对拷贝的任务队列去重，防止同时执行相同的拷贝任务
            this.copyPaths = lodash.unionBy(this.copyPaths, 'src');
            Promise.all(this.copyPaths.map(async (paths) => {
                    await copySync(paths.src, paths.dest);
            })).then(() => {
                updateProgress(`build assets : copy files sucess !`);
                resolve();
            }).catch((err) => console.error(err));
        });
    }
}
module.exports = new AssetBuilder();
