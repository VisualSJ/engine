const buildResult = require('./build-result');
const HashUuid = require('./hash-uuid');
const {outputFileSync} = require('fs-extra');
const {getDestPathNoExt} = require('./utils');
const _ = require('lodash');
class AssetPacker {
    constructor() {
        this.inlineSpriteFrames = []; // 存储需要内联的 spriteFrame 的信息
        this.startScene = []; // 存储初始需要合并的 uuid 信息
        this.uuidDepends = {}; // 存储内部过滤过的资源依赖映射关系
        this.groups = []; // 存储分组对象的内容信息
        this.havaPacker = {};
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
        // 移除只包含一个资源的分组(代表没有依赖其他资源)---但是要排除 spritFrame 资源
        this.groups = this.groups.filter((x) => {
            return (x.uuids && x.uuids.length > 1 && x.type !== 'spritFrame');
        });
        var uuidssArray = this.groups.map((x) => x.uuids); // 整合分组内的依赖 uuid 数组资源
        // 使用 HashUuid 来生成每组 uuid 对应新的 id 值
        const packUuidArray = HashUuid.calculate(uuidssArray, HashUuid.BuiltinHashType.PackedAssets);
        this.groups.forEach((item, index) => {
            let fileName = packUuidArray[index];
            packedAssets[fileName] = item.uuids;
            if (buildResult.options.platform === 'wechat-game-subcontext') {
                return;
            }
            if (item.type === 'texture') {
                // texture 资源打包
                this.packTexture(fileName, item.uuids);
            } else {
                // json 资源打包
                this.packJson(fileName, item.uuids);
            }
        });
        if (buildResult.options.platform === 'wechat-game-subcontext') {
            return;
        }
        // 打包独立资源
        this.packSingleJson(_.concat(uuidssArray));
        return packedAssets;
    }

    /**
     * 合并 texture2D 的资源 json 数据
     * @param {*} hasName
     * @param {*} uuids
     * @memberof AssetPacker
     */
    packTexture(hasName, uuids) {
        uuids.sort();
        let values = uuids.map(function(uuid) {
            if (!buildResult.jsonCache[uuid]) {
                throw new Error(`builderror: texture ${uuid} is not exit!`);
            }
            return buildResult.jsonCache[uuid].content.base;
        });
        values = values.join('|');
        const packedData = {
            type: cc.js._getClassId(cc.Texture2D),
            data: values,
        };
        const data = JSON.stringify(packedData, null, this.options.debug ? 0 : 2);
        outputFileSync(getDestPathNoExt(this.paths.res, hasName) + '.json', data);
    }

    /**
     * 打包一些单独的没有作为依赖项的资源 json 文件
     * @param {string[]} groupUuids
     * @memberof AssetPacker
     */
    packSingleJson(groupUuids) {
        let uuids = _.difference(Object.keys(buildResult.assetCache), groupUuids);
        if (!uuids || uuids.length < 0) {
            return;
        }
        for (let uuid of uuids) {
            if (!buildResult.jsonCache[uuid]) {
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
        // 遍历 uuid 计算依赖分组
        for (let uuid of Object.keys(buildResult.assetCache)) {
            let uuids = this._queryPackableDepends(uuid);
            if (!uuids) {
                continue;
            }
            this.uuidDepends[uuid] = uuids;
            this.groups.push({
                uuids,
                uuid,
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
     * 是否可以被打进其它包里面,原始资源不能被打包进其他包里
     */
    _queryPackableByUuid(uuid) {
        if (!buildResult.assetCache[uuid]) {
            return;
        }
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
        // 内联 spriteFrame
        this._inlineSpriteFrames();
        // 打包图片部分
        this._packAllTextures();
        // 合并初始场景的所有 json 文件
        if (this.options.mergeStartScene) {
            this._mergeStartScene();
        }
    }

    /**
     * 找到所有的 texture2D 资源 uuid
     * @returns {string[]}
     * @memberof AssetPacker
     */
    _packAllTextures() {
        let textureUuids = this._queryUuidssByType('cc.Texture2D');
        this.removeFromGroups(this.groups, textureUuids);
        this.groups.push({
            uuids: textureUuids,
            type: 'texture',
        });
        return textureUuids;
    }

    // TODO 简化该逻辑流程，循环太多次了
    /**
     * 找到所有的内联的 SpriteFrame 并记录分组，默认只内联零散的 SpriteFrame
     * @memberof AssetPacker
     */
    _inlineSpriteFrames() {
        // 1 - 找出所有 SpriteFrame
        let spriteFrameUuids = this._queryUuidssByType('cc.SpriteFrame');
        if (!spriteFrameUuids || spriteFrameUuids.length < 1) {
            return;
        }
        if (this.options.inlineSpriteFrames) {
            // 2 - 从 group 里移除全部 SpriteFrame，后面会再内联所有回去。
            this.removeFromGroups(this.groups, spriteFrameUuids);
        } else {
            // 2 - 或者，过滤掉已经在 group 并且合并数量大于 1 的 SpriteFrame，留下单独的 SpriteFrame
            let groupedUuids = new Set();
            for (let item of this.groups) {
                if (item.uuids.length > 1) {
                    for (let uuid of item.uuids) {
                        groupedUuids.add(uuid);
                    }
                }
            }
            spriteFrameUuids = spriteFrameUuids.filter((x) => !groupedUuids.has(x));
        }
        // 3 - 如果这些 SpriteFrame 的被依赖的资源在 group 中，则添加到对应 group，否则新建 group
        let inlinedUuids = this._inlineToDependsGroup(spriteFrameUuids);
        // 4 - 如果 SpriteFrame 在 原始 uuids 中，则同时保留一份单独的 json，否则 loadRes 时会加大下载量
        for (let inlineUuid of inlinedUuids) {
            if (buildResult.rootUuids.indexOf(inlineUuid) !== -1) {
                // 添加只有一个资源的分组
                groups.push({
                    uuids: [inlineUuid],
                    type: 'spriteFrame',
                });
                console.info(`add dummy group to allow download ${inlineUuid} individually`);
            }
        }
    }

    /**
     * 查找传入 uuids 数组在其他资源的依赖项中的部分
     * @param {*} uuids
     * @returns {string[]}
     * @memberof AssetPacker
     */
    _inlineToDependsGroup(uuids) {
        let inlinedUuids = []; // 收集依赖项容器
        for (let uuid of uuids) {
            let inlineCount = 0;
            for (let depend of Object.keys(buildResult.uuidDepends)) {
                let result = buildResult.uuidDepends[depend];
                if (typeof result !== 'object') { // 排除 undined/null 等不合法数据类型
                    continue;
                }
                let depends = result.depends;
                // 1. 遍历传入 uuid 同时遍历原始依赖数组，查找是否包含对应 uuid
                if (depends && depends.indexOf(uuid) !== -1) {
                    // 2. 查到该资源有作为其他资源的依赖项后，再遍历 groups 找到对应的分组加入
                    for (let group of this.groups) {
                        let uuids = group.uuids;
                        if (uuids.indexOf(depend) !== -1) {
                            if (uuids.indexOf(uuid) === -1) {   // 有可能一个组里同时有多个被依赖资源，所以这里要防止重复添加
                                uuids.push(uuid);
                                ++inlineCount;
                            }
                            groups.push({
                                name: '',
                                uuids: [depend, uuid],
                            });
                            ++inlineCount;
                        }
                    }
                }
            }
            if (inlineCount > 0) {
                console.info(`inline SpriteFrame: ${uuid}, inline count: ${inlineCount}`);
                inlinedUuids.push(uuid);
            }
        }
        return inlinedUuids;
    }

    /**
     * 查找指定类型的 uuid 数组
     * @param {string} type
     * @memberof AssetPacker
     */
    _queryUuidssByType(type) {
        let uuids = [];
        for (let asset of Object.values(buildResult.assetCache)) {
            if (asset.type === type) {
                uuids.push(asset.uuid);
            }
        }
        return uuids;
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
     * 将 uuid 数组从已知的分组里面移除
     * @param {*} groups
     * @param {*} uuidsToRemove
     * @memberof AssetPacker
     */
    removeFromGroups(groups, uuidsToRemove) {
        for (let i = 0; i < groups.length; i++) {
            let groupUuids = groups[i].uuids;
            if (!groupUuids) {
                continue;
            }
            for (let j = 0; j < uuidsToRemove.length; j++) {
                const index = groupUuids.indexOf(uuidsToRemove[j]);
                groupUuids.splice(index, 1);
            }
            if (groupUuids.length === 0) {
                groups.splice(i, 1);
                --i;
            }
        }
    }
}

module.exports = new AssetPacker();
