'use strict';

const Mode = require('./mode');

const utils = require('../utils');
const prefabUtils = require('../../prefab/utils');

class PrefabMode extends Mode {

    get name() {
        return 'prefab';
    }

    constructor(manager) {
        super(manager);

        // 当前正在编辑的 prefab 资源的 uuid
        this.current = '';
        // 当前打开的 prefab 里的 node 的 uuid
        this.node = '';

        this.lastSaveData = null;
    }

    /**
     * 打开 Prefab 编辑模式
     */
    async open(uuid) {
        // 如果打开某个资源，且资源正在编辑，则不处理
        if (uuid && this.current === uuid) {
            return false;
        }

        const prefab = await utils.loadPrefab(uuid);

        // 如果 prefab 存在，则进入打开流程，不存在则提示警告并且打开空场景
        if (!prefab) {
            this.current = '';
            return false;
        }
        const scene = new cc.Scene();
        const node = cc.instantiate(prefab);
        node.parent = scene;
        this.node = node.uuid;

        const info = await Manager.Ipc.send('query-asset-info', uuid);
        scene.name = info.name; // 重要：如 name = Cube.prefab，表示场景给 prefab 编辑使用，后续样式会以此判断，
        Manager.Ipc.send('toolbar', 'prefab'); // 显示工具条

        try {
            await utils.loadSceneByNode(scene);
            this.current = uuid;

            // 默认选中当前节点
            Manager.Selection.select(this.node);

            // 发送 emit 事件
            this.manager.emit('open', cc.director._scene);
            Manager.Ipc.forceSend('broadcast', 'scene:ready', '');

            this.lastSaveData = this.serialize();

            super.open(uuid);
            return true;
        } catch (error) {
            console.error('Open prefab failed: ' + uuid);
            console.error(error);
        }

        this.current = '';

        return false;
    }

    /**
     * 关闭正在编辑的场景
     * @return {Boolean} 是否关闭场景
     */
    async close() {
        // 如果更改，则询问是否需要保存
        const json = this.serialize();
        if (this.lastSaveData !== json) {
            const code = await Manager.Ipc.send('dirty-dialog', 'Prefab');
            switch (code) {
                case 0:
                case '0':
                    // Save
                    await this.save();
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
        Manager.Selection.clear();

        // 发送关闭之前的场景的广播消息
        Manager.Ipc.forceSend('broadcast', 'scene:close');
        this.manager.emit('close');

        this.lastSaveData = null;
        Manager.Ipc.send('toolbar', ''); // 关闭工具条

        super.close();
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
        console.log('TODO SoftReload');
        // const scene = cc.director.getScene();
        // if (!scene) {
        //     return false;
        // }

        // try {
        //     const json = Manager.Utils.serialize(scene);
        //     await utils.loadSceneByJson(json);
        // } catch (error) {
        //     console.error('Open scene failed: ' + uuid);
        //     console.error(error);
        // }
    }

    /**
     * 序列化当前正在编辑的场景
     */
    serialize() {
        const node = Manager.Node.query(this.node);
        if (!node) {
            return null;
        }
        const prefab = new cc.Prefab();
        const dump = prefabUtils.getDumpableNode(node);
        prefab.data = dump;
        return Manager.Utils.serialize(prefab);
    }

    /**
     * 保存 prefab 数据
     */
    async save() {
        const newData = this.serialize();
        await Manager.Ipc.send('save-asset', this.current, newData);
        this.lastSaveData = newData;
    }

}

module.exports = PrefabMode;
