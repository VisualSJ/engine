const Path = require('fire-path');
const Async = require('async');
const Lodash = require('lodash');
const Fs = require('fire-fs');

const Utils = require('./utils');

const _previewTempDir = Path.join(Editor.remote.Project.path, 'temp/TexturePacker/preview');
const _buildTempDir = Path.join(Editor.remote.Project.path, 'temp/TexturePacker/build');

const RAW_ASSET_DEST = 'raw-assets';

class TexturePacker {
    async init (opts) {
        this.writer = opts.writer;
        this.platform = opts.platform;

        this.needPackSpriteFrames = [];

        let result = await Utils.queryAtlases(opts.files);

        this.spriteFrames = result.spriteFrames;
        this.pacInfos = result.pacInfos;
        this.textureUuids = result.textureUuids;
        this.texture2pac = result.texture2pac;
    }

    needPack (uuid) {
        if (this.textureUuids.indexOf(uuid) !== -1) {
            return true;
        }

        let spriteFrames = this.spriteFrames;

        for (let i = 0; i < spriteFrames.length; i++) {
            var spriteFrame = spriteFrames[i];
            if (spriteFrame._uuid === uuid) {
                if (this.needPackSpriteFrames.indexOf(spriteFrame) === -1) {
                    this.needPackSpriteFrames.push(spriteFrame);
                }
                return false;
            }
        }

        return false;
    }

    async pack () {
        let unpackedTextures = [];

        // uuid of packed spriteFrames to packed texture
        let packedSpriteFrames = Object.create(null);
        // paths of packed textures
        let packedTextures = Object.create(null);

        let dest = Path.join(_buildTempDir, RAW_ASSET_DEST);

        let opts = {
            dest: dest,
            pacInfos: this.pacInfos,
            needPackSpriteFrames: this.needPackSpriteFrames,
            needCompress: true
        };

        let results = await Utils.pack(opts);

        await Promise.all(results.map(async result => {
            unpackedTextures = unpackedTextures.concat(result.unpackedTextures);

            let pacInfo = result.pacInfo;

            // atlas
            let spriteAtlas = new cc.SpriteAtlas();
            spriteAtlas._uuid = pacInfo.info.uuid;

            await Promise.all(result.atlases.map(async atlas => {
                let HashUuid = require('../hash-uuid');

                // 一个 AutoAtlas 可能会生成多张大图
                // 这里使用大图里的碎图 uuid 来计算大图的 uuid
                let uuids = atlas.files.map(file => file.uuid);
                let textureUuid = HashUuid.calculate([uuids], HashUuid.BuiltinHashType.AutoAtlasTexture)[0];

                if (!atlas.compressd) {
                    throw(`Cann't find atlas.compressed.`);
                }

                let suffix = atlas.compressd.suffix;
                let destTexturePathNoExt = Path.join(this.writer.dest, '..', RAW_ASSET_DEST, textureUuid.slice(0, 2), textureUuid);

                await Promise.all(suffix.map(async ext => {
                    await new Promise((resolve, reject) => {
                        let src = atlas.compressd.imagePathNoExt + ext;
                        let dst = destTexturePathNoExt + ext;
                        Fs.copy(src, dst, (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });
                }));

                // write texture asset
                let texture = new cc.Texture2D();
                texture._exportedExts = suffix;

                texture._uuid = textureUuid;
                texture.width = atlas.width;
                texture.height = atlas.height;

                await this.write(texture);

                let texturePath = destTexturePathNoExt + '.png'
                packedTextures[textureUuid] = texturePath;

                // write spriteframes
                await Promise.all(atlas.files.map(async item => {
                    // only pack needed sprite frames
                    if (this.needPackSpriteFrames.indexOf(item.spriteFrame) === -1) {
                        return;
                    }

                    let spriteFrame = this.generateSpriteFrame(item, spriteAtlas._uuid, textureUuid);
                    packedSpriteFrames[spriteFrame._uuid] = textureUuid;

                    //
                    spriteAtlas._spriteFrames[item.name] = Editor.serialize.asAsset(spriteFrame._uuid);

                    await this.write(spriteFrame);
                }));
            }));

            await this.write(spriteAtlas);
        }))

        return { unpackedTextures, packedSpriteFrames, packedTextures };
    }

    generateSpriteFrame (item, atlasUuid, textureUuid) {
        let spriteFrame = new cc.SpriteFrame();

        let oldSpriteFrame = item.spriteFrame;

        spriteFrame._name = item.name;
        spriteFrame._atlasUuid = atlasUuid;
        spriteFrame._uuid = oldSpriteFrame._uuid;

        let trim = item.trim;
        spriteFrame._rect = cc.rect(trim.x, trim.y, trim.width, trim.height);

        spriteFrame._offset = oldSpriteFrame.getOffset();
        spriteFrame._originalSize = cc.size(item.rawWidth, item.rawHeight);

        spriteFrame._rotated = item.rotated;

        spriteFrame.insetLeft = oldSpriteFrame.insetLeft;
        spriteFrame.insetTop = oldSpriteFrame.insetTop;
        spriteFrame.insetRight = oldSpriteFrame.insetRight;
        spriteFrame.insetBottom = oldSpriteFrame.insetBottom;

        spriteFrame._texture = Editor.serialize.asAsset(textureUuid);

        return spriteFrame;
    }

    async write (asset, cb) {
        let contentJson = Editor.serialize(asset, {
            exporting: true,
            nicify: true,
            stringify: false,
            dontStripDefault: false
        });
        await new Promise((resolve, reject) => {
            this.writer.writeJsonByUuid(asset._uuid, contentJson, err => {
                if (err) return reject(err);
                resolve();
            });
        })
    }
}


TexturePacker.generatePreviewFiles = async function (uuid) {
    let info = Editor.remote.assetdb.assetInfoByUuid(uuid);
    let dest = _previewTempDir;

    // 查询 .pac 信息
    let queryResult = await Utils.queryAtlases(info);

    // 进行合图
    await Utils.pack({ pacInfos: queryResult.pacInfos, dest });
};

TexturePacker.queryPreviewInfo = function (uuid, cb) {
    let assetsPath = Editor.url('db://assets');

    let info = Editor.remote.assetdb.assetInfoByUuid(uuid);
    let relative = Path.relative(assetsPath, Path.dirname(info.path));
    let dest = Path.join(_previewTempDir, relative, Path.basename(info.path));
    let infoPath = Path.join(dest, 'info.json');
    if (!Fs.existsSync(infoPath)) {
        return cb(null);
    }

    let packInfo = Fs.readJSONSync(infoPath);
    if (!packInfo.result) {
        return cb(null);
    }

    let packedTextures = packInfo.result.atlases.map(atlas => ({
        path: atlas.imagePath,
        name: Path.basename(atlas.imagePath),
        size: atlas.width + 'x' + atlas.height,
    }));

    let unpackedTextures = packInfo.result.unpackedTextures.map(data => {
        let libPath = data.originalPath || data.path;
        let rawPath = Editor.assetdb.remote.uuidToFspath(data.textureUuid);
        return {
            path: libPath,
            name: Path.basename(rawPath),
            size: data.width + 'x' + data.height,
        };
    });

    cb(null, { packedTextures, unpackedTextures });
};

module.exports = TexturePacker;
