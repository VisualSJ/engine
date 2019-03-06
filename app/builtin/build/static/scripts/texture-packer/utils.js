const Path = require('fire-path');
const Fs = require('fire-fs');
const Lodash = require('lodash');
const Globby = require('globby');
const Del = require('del');

const packer = require('./packer');
const CompressTexture = Editor.require('app://editor/page/build/texture-compress');

class PacInfo {
    /**
     * @param {Object} pacAssetInfo 从 Editor.assetdb.queryAssets 中获取出来的 pac 信息
     */
    async init (pacAssetInfo) {
        let path = pacAssetInfo.path;

        let metaPath = path + '.meta';
        let meta = Fs.readJSONSync(metaPath);

        let urlPattern = Path.dirname(pacAssetInfo.url) + '/**/*';

        let spriteFrameInfos = await new Promise((resolve, reject) => {
            Editor.assetdb.queryAssets(urlPattern, ['sprite-frame'], (err, spriteFrameInfos) => {
                if (err) return reject(err);
                resolve(spriteFrameInfos);
            });
        });

        // 查找子文件夹中的 .pac 文件，如果有则排除子文件夹下的 sprite frame
        let dirname = Path.dirname(path);
        let subPacPattern = [Path.join(dirname, '**/*.pac'), '!' + Path.join(dirname, '*.pac')];
        let subPacDirs = await new Promise((resolve, reject) => {
            Globby(subPacPattern, (err, paths) => {
                if (err) return reject(err);
                resolve(paths.map(path => Path.dirname(path)));
            })
        });

        // 排除含有 .pac 文件的子文件夹下的 sprite frame
        spriteFrameInfos = spriteFrameInfos.filter(info => {
            for (let i = 0; i < subPacDirs.length; i++) {
                if (Path.contains(subPacDirs[i], info.path)) return false;
            }
            return true;
        });

        if (spriteFrameInfos.length === 0) {
            Editor.warn(`No SpriteFrame find in forlder [${Path.dirname(pac.url)}]. Please check the AutoAtlas [${path}].`);
            return;
        }

        let textureUuids = [];
        let spriteFrames = await Promise.all(spriteFrameInfos.map(async info => {
            return new Promise((resovle, reject) => {
                cc.AssetLibrary.loadAsset(info.uuid, (err, spriteFrame) => {
                    if (err) return reject(err);

                    spriteFrame.pacInfo = this;
                    textureUuids.push(spriteFrame.getTexture()._uuid);
                    resovle(spriteFrame);
                });
            })
        }));
        textureUuids = Lodash.uniq(textureUuids);

        let assetsPath = Editor.url('db://assets');

        this.meta = meta;
        this.info = pacAssetInfo;
        this.spriteFrames = spriteFrames;
        this.textureUuids = textureUuids;
        this.relativePath = Path.relative(assetsPath, path);
        this.relativeDir = Path.relative(assetsPath, Path.dirname(path))

        return this;
    }
}

/**
 * 根据传入的自动合图的 asset info 查找对应的信息
 */
exports.queryAtlases = async function (pacs) {
    let result = {
        textureUuids: [],
        spriteFrames: [],
        pacInfos: [],
        texture2pac: {}
    };

    pacs = Array.isArray(pacs) ? pacs : [pacs];

    await Promise.all(pacs.map(async pac => {
        let pacInfo = await new PacInfo().init(pac);

        pacInfo.textureUuids.forEach(uuid => {
            result.texture2pac[uuid] = pacInfo;
        });

        result.textureUuids = result.textureUuids.concat(pacInfo.textureUuids);
        result.spriteFrames = result.spriteFrames.concat(pacInfo.spriteFrames);
        result.pacInfos.push(pacInfo);
    }));

    result.textureUuids = Lodash.uniq(result.textureUuids);
    result.spriteFrames = Lodash.uniq(result.spriteFrames);

    return result;
};

/**
 * 获取自动合图 之前保存的 和 当前的 信息，
 * 信息主要包括自动合图引用到的 sprite frame ，texture ，auto atlas 的 asset mtime 是否改变了
 * 如果 mtime 改变了，则表示对应的资源有修改过，应该要重新进行合图
 * @param {*} dest 
 * @param {*} pacInfo 
 * @param {*} spriteFrames 
 */
async function getStoredPacInfo (destDir, pacInfo, spriteFrames) {
    let storedPacInfoPath = Path.join(destDir, 'info.json');
    let storedPacInfo = {};
    if (Fs.existsSync(storedPacInfoPath)) {
        storedPacInfo = Fs.readJSONSync(storedPacInfoPath);
    }

    // 检查
    let newStoredPacInfo = {
        mtimes: {}
    };

    let assetUuids = [pacInfo.meta.uuid];

    spriteFrames.forEach(spriteFrame => {
        assetUuids.push(spriteFrame._uuid);
        assetUuids.push(spriteFrame.getTexture()._uuid);
    });

    assetUuids = Lodash.uniq(assetUuids);

    await Promise.all(assetUuids.map(async uuid => {
        // 根据 asset mtime 和 meta mtime 判断资源是否被修改过
        let mtime = await new Promise((resolve, reject) => {
            Editor.assetdb.queryMetaInfoByUuid(uuid, (err, info) => {
                if (err) return reject(err);
                resolve({assetMtime: info.assetMtime, metaMtime: info.metaMtime});
            })
        });

        newStoredPacInfo.mtimes[uuid] = mtime;
    }));

    return {
        storedPacInfoPath,
        newStoredPacInfo,
        storedPacInfo
    };
}

/**
 * @param {Object} opts
 * @param {[PacInfo]} opts.pacInfos
 * @param {[SpriteFrame]} opts.needPackSpriteFrames
 * @param {String} opts.dest
 * @param {Boolean} opts.needCompress
 * @param {String} opts.platform - 设置纹理压缩的平台，与 opts.needCompress 一起使用
 */
exports.pack = async function (opts) {
    let { pacInfos, needPackSpriteFrames, dest, needCompress, platform } = opts;

    let results = [];

    // 为了防止多个合图同时进行内存占用过大，这里的任务是一个一个往下进行的。
    for (let i = 0; i < pacInfos.length; i++) {
        let pacInfo = pacInfos[i];

        let meta = pacInfo.meta;
        let pacOpts = cc.js.mixin({
            name: Path.basenameNoExt(pacInfo.info.path),
            width: meta.maxWidth,
            height: meta.maxHeight
        }, meta);

        // 首先剔除不需要打包的 sprite frame
        let spriteFrames = pacInfo.spriteFrames;
        if (meta.filterUnused && needPackSpriteFrames) {
            let resourcesDir = Editor.url('db://assets/resources');
            if (pacInfo.info.path.indexOf(resourcesDir) !== -1) {
                Editor.warn(`AutoAtlas [${pacInfo.info.path}] is in resources dir. Option [Filter Unused] will not be used.`);
            }
            else {
                spriteFrames = spriteFrames.filter(spriteFrame => {
                    for (let i = 0; i < needPackSpriteFrames.length; i++) {
                        if (needPackSpriteFrames[i]._uuid === spriteFrame._uuid) {
                            return true;
                        }
                    }

                    return false;
                });
            }
        }

        if (spriteFrames.length === 0) {
            throw new Error(`No SpriteFrame provides. Please check your options. Abort pack AutoAtlas [${pacInfo.info.path}].`);
        }

        // 获取缓存打包结果的目录
        let destDir = Path.join(dest, pacInfo.relativePath);

        let { storedPacInfoPath, newStoredPacInfo, storedPacInfo } = await getStoredPacInfo(destDir, pacInfo, spriteFrames);
        // 比较 asset 的 mtime，详见 getStoredPacInfo 描述
        let dirty = !Lodash.isEqual(newStoredPacInfo.mtimes, storedPacInfo.mtimes);

        let result;

        if (!dirty) {
            result = storedPacInfo.result;
            result.atlases.forEach(atlas => {
                atlas.files.forEach(file => {
                    file.spriteFrame = spriteFrames.find(spriteFrame => spriteFrame._uuid === file.uuid);
                });
            });
        }
        else {
            // 先清空 pacinfo 的缓存目录
            Del.sync(destDir, {force: true});

            result = await new Promise((resolve, reject) => {
                packer(spriteFrames, pacOpts, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            // 生成合图后的大图
            await Promise.all(result.atlases.map(async atlas => {
                let imagePath = Path.join(destDir, atlas.name + '.png');
                Fs.ensureDirSync(Path.dirname(imagePath));
                atlas.imagePath = imagePath;
                return new Promise((resolve, reject) => {
                    atlas.sharp.toFile(imagePath, (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            }));

            if (global.gc) {
                global.gc();
            }

            if (needCompress) {
                // 进一步对生成的图片进行压缩
                await Promise.all(result.atlases.map(async atlas => {
                    let compressedImagePath = Path.join(destDir, 'compressed', atlas.name + '.png');
                    Fs.ensureDirSync(Path.dirname(compressedImagePath));

                    let suffix = await new Promise((resolve, reject) => {
                        CompressTexture({
                            src: atlas.imagePath,
                            dst: compressedImagePath,
                            platform: platform,
                            compressOption: pacInfo.meta.platformSettings,
                        }, (err, suffix) => {
                            if (err) return reject(err);
                            resolve(suffix);
                        });
                    });

                    if (suffix.length === 0) {
                        suffix = ['.png'];
                    }

                    atlas.compressd = {
                        suffix: suffix,
                        imagePathNoExt: Path.join(Path.dirname(compressedImagePath), Path.basenameNoExt(compressedImagePath))
                    };
                }));
            }

            newStoredPacInfo.result = result;
            Fs.ensureDirSync(destDir);
            Fs.writeFileSync(storedPacInfoPath, JSON.stringify(newStoredPacInfo, null, 2));
        }

        result.pacInfo = pacInfo;
        results.push(result);
    }

    return results;
};
