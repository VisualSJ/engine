'use strict';

const { existsSync, readFileSync } = require('fs-extra');

const Mode = require('./mode');

const utils = require('../utils');
const ipc = require('../../ipc');

class SceneMode extends Mode {

    constructor(manager) {
        super(manager);

        // 当前正在编辑的场景的 uuid
        this.current = '';

        // 记录最后一次保存的数据，用于判断 dirty
        this.lastSaveData = null;

        // 暂存的场景 json
        this._staging = null;
    }

    /**
     * 打开一个场景资源
     * @param {*} uuid
     * @return {Boolean} 是否打开场景
     */
    async open(uuid) {
        if (this._staging) {
            console.warn('Scene data has been temporarily stored. Unable to open new scene.');
            return false;
        }

        if (!uuid) {
            uuid = await Manager.Ipc.send('query-scene'); // 获取上次打开的场景
        }

        // 如果 uuid 存在，则打开某个场景资源
        if (uuid) {
            if (this.current === uuid) {
                return true; // 场景已打开
            } else {
                if (!await this.close()) { // 其次尝试关闭之前的场景
                    return false; // 取消关闭
                }
            }

            try {
                await utils.loadSceneByUuid(uuid);
                this.current = uuid;

                // 发送 emit 事件
                this.manager.emit('open', cc.director._scene);

                // 广播场景打开消息
                await Manager.Ipc.send('set-scene', uuid);
                Manager.Ipc.forceSend('broadcast', 'scene:ready', uuid);

                // 缓存最后一次保存的数据
                this.lastSaveData = this.serialize();
                return true;
            } catch (error) {
                console.error('Open scene failed: ' + uuid);
                console.error(error);
            }
        }

        this.current = '';

        // 如果上述判断都不存在，则尝试打开空场景
        // 1. uuid 不存在
        // 2. 打开资源失败
        const fileUuid = await ipc.send('query-asset-uuid', 'db://internal/default_file_content/scene');
        const fileInfo = await ipc.send('query-asset-info', fileUuid);
        if (!existsSync(fileInfo.file)) {
            console.error('Open scene failed: template file is not exist.');
            return false;
        }

        const fileContent = readFileSync(fileInfo.file);
        await utils.loadSceneByJson(fileContent);

        // 发送 emit 事件
        this.manager.emit('open', cc.director._scene);
        Manager.Ipc.forceSend('broadcast', 'scene:ready', '');
        // 缓存最后一次保存的数据
        this.lastSaveData = this.serialize();

        return true;
    }

    /**
     * 关闭正在编辑的场景
     * @return {Boolean} 是否关闭场景
     */
    async close() {
        if (this._staging) {
            return console.warn('Scene data has been temporarily stored. Unable to close new scene.');
        }

        // 如果更改，则询问是否需要保存
        const json = this.serialize();
        if (this.lastSaveData !== json) {
            const code = await ipc.send('dirty-dialog', 'Scene');
            switch (code) {
                case 0:
                case '0':
                    // Save
                    await ipc.send('save-asset', this.current, json);
                    break;
                case 1:
                case '1':
                    // Don't Save
                    break;
                case 2:
                case '2': // Cancel
                    return false;
            }
        }
        this.current = '';

        // 发送 emit 事件
        this.manager.emit('close');

        // 发送关闭之前的场景的广播消息
        Manager.Ipc.forceSend('broadcast', 'scene:close');

        // 缓存最后一次保存的数据
        this.lastSaveData = null;

        return true;
    }

    /**
     * 刷新当前场景并且放弃所有修改
     * @return {Boolean} 是否刷新场景
     */
    async reload() {
        const uuid = this.current;
        if (!await this.close()) {
            return false;
        }
        if (!await this.open(uuid)) {
            return false;
        }
        return true;
    }

    /**
     * 软刷新场景
     */
    async softReload() {
        const scene = cc.director.getScene();
        if (!scene) {
            return false;
        }

        try {
            const json = Manager.Utils.serialize(scene);

            // 发送 emit 事件
            this.manager.emit('close');

            await utils.loadSceneByJson(json);

            // 发送 emit 事件
            this.manager.emit('open', cc.director._scene);
        } catch (error) {
            console.error('Open scene failed: ' + uuid);
            console.error(error);
        }
    }

    /**
     * 序列化当前正在编辑的场景
     */
    serialize() {
        const scene = cc.director.getScene();
        if (!scene) {
            return null;
        }
        const asset = new cc.SceneAsset();
        asset.scene = scene;
        return Manager.Utils.serialize(asset);
    }

    /**
     * 保存场景
     */
    async save(url) {
        const json = this.serialize();

        if (this.current && !url) {
            await ipc.send('save-asset', this.current, json);
        } else {
            url = await ipc.send('generate-available-url', url || 'db://assets/New Scene.scene');
            const uuid = await ipc.send('create-asset', url, json);
            this.current = uuid;
            Manager.Ipc.send('set-scene', uuid);
        }

        this.lastSaveData = json;
        return this.current;
    }

    /**
     * 缓存当前正在编辑的场景
     */
    async staging() {
        if (this._staging) {
            return;
        }
        this._staging = Manager.Utils.serialize(cc.director._scene);

        // 发送 emit 事件
        this.manager.emit('close');

        return false;
    }

    /**
     * 还原当前正在编辑的场景
     */
    async restore() {
        if (!this._staging) {
            return false;
        }
        await utils.loadSceneByJson(this._staging);

        // 发送 emit 事件
        this.manager.emit('open', cc.director._scene);
        Manager.Ipc.forceSend('broadcast', 'scene:ready', '');
        this._staging = null;
        return true;
    }
}

module.exports = SceneMode;
