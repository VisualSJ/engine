const buildResult = require('./build-result');
const HashUuid = require('./hash-uuid');
const {outputFileSync} = require('fs-extra');
const {getDestPathNoExt} = require('./utils');
const _ = require('lodash');
class AssetPacker {
    constructor() {
        this.inlineSpriteFrames = []; // 存储需要内联的 spriteFrame 的信息
        this.startScene = []; // 存储初始需要合并的 uuid 信息
        this.uuidDepends = {};
        this.groups = []; // 存储分组对象的内容信息
    }

    /**
     * 入口，开始打包
     * @memberof AssetPacker
     */
    pack() {
        const packedAssets = {};
        this.options = buildResult.options;
        this.paths = buildResult.paths;
        this._computeGroup();
        // 移除只包含一个资源的分组(代表没有依赖其他资源)
        let newUuids = [];
        this.groups = this.groups.filter((x) => {
            if (!x.uuids || x.uuids.length <= 1) {
                newUuids.push(x.uuid);
                return;
            }
            return true;
        });
        var uuidssArray = this.groups.map((x) => x.uuids); // 整合分组内的依赖 uuid 数组资源
        // 使用 HashUuid 来生成每组 uuid 对应新的 id 值
        const packUuidArray = HashUuid.calculate(uuidssArray, HashUuid.BuiltinHashType.PackedAssets);
        this.groups.forEach((item, index) => {
            let fileName = packUuidArray[index];
            packedAssets[fileName] = item.uuids.map((x) => this.compressUuid(x));
            if (item.name === 'texture') {
                // todo 图片资源打包
            } else {
                // json 资源打包
                this.packJson(fileName, item.uuids);
            }
        });
        this.packSingleJson(newUuids, _.concat(uuidssArray));
        return packedAssets;
    }

    compressUuid(uuid) {
        // 非调试模式下， uuid 需要压缩成短 uuid
        if (this.options && !this.options.debug) {
            uuid = Editor.Utils.UuidUtils.compressUuid(uuid, true);
        }
        return uuid;
    }

    /**
     * 打包一些单独的没有作为依赖项的资源 json 文件
     * @param {string[]} uuids
     * @param {string[]} groupUuids
     * @memberof AssetPacker
     */
    packSingleJson(uuids, groupUuids) {
        if (!uuids || uuids.length < 0) {
            return;
        }
        for (let uuid of uuids) {
            if (groupUuids.includes(uuid) || !buildResult.jsonCache[uuid]) {
                return;
            }
            const data = JSON.stringify(buildResult.jsonCache[uuid], null, this.options.debug ? 0 : 2);
            outputFileSync(getDestPathNoExt(this.paths.res, uuid) + '.json', data);
        }
    }

    /**
     * 打包 json 文件并写入
     * @param {string} hasName 打包后写入的文件名
     * @param {string[]} uuids 打包具体的 uuid 数组
     * @memberof AssetPacker
     */
    packJson(hasName, uuids) {
        uuids = uuids.sort();
        const values = uuids.map(function(uuid) {
            return buildResult.jsonCache[uuid];
        });
        const data = JSON.stringify(values, null, this.options.debug ? 0 : 2);
        outputFileSync(getDestPathNoExt(this.paths.res, hasName) + '.json', data);
    }

    // 计算分组
    _computeGroup() {
        // 先将依赖 uuid 里不能打包的部分剔除,并需要剔除合并初始场景资源的相关代码
        for (let uuid of Object.keys(buildResult.assetCache)) {
            let uuids = this._queryPackableDepends(uuid);
            this.uuidDepends[uuid] = uuids;
            this.groups.push({
                uuids,
                uuid,
                name: '',
            });
        }
        // 合并一些其他需求的 json 包
        this._mergeSmallFiles();
    }

    /**
     * 获取所有可被打包的依赖项的 uuid，如果有依赖项，返回结果将包含 uuid 自身，否则返回 null
     */
    _queryPackableDepends(uuid) {
        const depends = buildResult.uuidDepends[uuid];
        if (!Array.isArray(depends) || depends.length === 0) {
            return null;
        }
        const uuids = _([uuid])
                    .concat(depends)
                    .uniq()     // depends 有可能包含重复字段
                    .value();
        // 过滤不能被打包的 uuid
        return uuids.filter((uuid) => {
            return this._queryPackableByUuid(uuid);
        });
    }

    /**
     * 是否可以被打进其它包里面,非原始资源，不能被打包进其他包里
     */
    _queryPackableByUuid(uuid) {
        let type = buildResult.assetCache[uuid].type;
        if (!type) {
            return false;
        }
        return !cc.RawAsset.isRawAssetType(type);
    }

    /**
     * 进一步合并小文件，减少 IO 请求数量，但一般会增大包体
     */
    _mergeSmallFiles() {
        // 内联所有的 spriteFrame
        if (this.options.inlineSpriteFrames) {
            this._inlineSpriteFrames();
        }
        // 打包图片部分
        this._packAllTextures();
        // 合并初始场景的所有 json 文件
        if (this.options.mergeStartScene) {
            this._mergeStartScene();
        }
    }

    /**
     * 找到所有的 texture 相关资源
     * @memberof AssetPacker
     */
    _packAllTextures() {

    }

    /**
     * 找到初始资源相关的资源信息并分组
     * @memberof AssetPacker
     */
    _mergeStartScene() {
        // 1 - 获取 start_scene 依赖的所有资源（含 startSceneUuid）
        let uuids = this.uuidDepends[this.options.start_scene];
        if (uuids) {
            // 2 - 如果资源存在 groups 中，从 groups 剔除
            this.removeFromGroups(groups, uuids);
            // 3 - 将依赖的资源作为新的 group 添加
            this.groups.push({ name: '', uuids});
        }
    }

    /**
     * 找到所有的内联的 SpriteFrame 并记录分组
     * @memberof AssetPacker
     */
    _inlineSpriteFrames() {

    }

    /**
     * 将 uuid 数组从已知的分组里面移除
     * @param {*} groups
     * @param {*} uuidsToRemove
     * @memberof AssetPacker
     */
    removeFromGroups(groups, uuidsToRemove) {
        let fastRemove = cc.js.array.fastRemove;
        for (let i = 0; i < groups.length; i++) {
            let groupUuids = groups[i].uuids;
            for (let j = 0; j < uuidsToRemove.length; j++) {
                fastRemove(groupUuids, uuidsToRemove[j]);
            }
            if (groupUuids.length === 0) {
                cc.js.array.fastRemoveAt(groups, i);
                --i;
            }
        }
    }
}

module.exports = new AssetPacker();
