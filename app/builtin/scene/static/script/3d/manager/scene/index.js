'use strict';

const { EventEmitter } = require('events');

const utils = require('./utils');
const ipc = require('../ipc');
const nodeManager = require('../node');
const { existsSync, readFileSync } = require('fs');
const prefabUtils = require('../prefab/utils');

let currentSceneUuid = '';
let currentSceneData = null;

/**
 * 场景管理器
 *
 * Events:
 *   scene.on('open', (error, scene) => {});
 *   scene.on('close', (error) => {});
 *   scene.on('reload', (error, scene) => {});
 */
class SceneManager extends EventEmitter {

    /**
     * 切换当前场景的编辑状态
     * 可以是 cc.Scene | cc.Prefab | cc.Animation
     * @param {*} type 
     */
    async _changeType(type) {

        if (this.type === 'cc.Scene') {
            // 如果当前打开的是场景            
            switch (type) {
                case 'cc.Prefab': // 切换到 prefab，则需要缓存场景数据
                    this.staging();
                    document.body.appendChild(this.$prefab);
                    break;
                case 'cc.Animation': // 切换到 animation，暂未处理
                    this.$prefab.parentElement && this.$prefab.remove();
                    break;
                default: // 切换场景，尝试关闭之前场景
                    await this.close();
                    this.$prefab.parentElement && this.$prefab.remove();
                    break;
            }
        } else {
            // 如果打开的不是场景
            switch (type) {
                case 'cc.Prefab': // 切换到 prefab，则需要缓存场景数据
                await this.close();
                    document.body.appendChild(this.$prefab);
                    break;
                case 'cc.Animation': // 切换到 animation，暂未处理
                    await this.close();
                    this.$prefab.parentElement && this.$prefab.remove();
                    break;
                default: // 切换场景，尝试关闭之前正在编辑的东西以及缓存的场景
                    await this.close(); // todo
                    this.$prefab.parentElement && this.$prefab.remove();
                    break;
            }
        }

        // 更新 type 数据
        this.type = type;

        return true;
    }

    constructor() {
        super();
        this.ignore = false;

        // 可以打开场景模式以及预制件模式
        this.type = 'cc.Scene';
        // 当前打开的 prefab 节点的 uuid
        this.prefab = '';
        // 缓存最后打开的场景的信息
        this._cache = null;

        // wasd 按键提示
        this.$prefab = document.createElement('div');
        // $info.hidden = true;
        this.$prefab.id = 'preafab_info';
        this.$prefab.innerHTML = `
        <style>
            #preafab_info { position: absolute; top: 10px; left: 10px; font-size: 12px; text-align: center; color: #fff; }
            #preafab_info div { padding: 2px 0; }
            #preafab_info span { border: 1px solid #fff; border-radius: 2px; padding: 0 4px; }
        </style>
        <div>
            <button>Save</button>
            <button>Close</button>
        </div>
        `;
    }

    /**
     * 打开一个场景资源
     * @param {*} uuid 场景资源的 uuid
     */
    async open(uuid) {
        if (uuid && uuid === currentSceneUuid) {
            return;
        }

        // cc.view.resizeWithBrowserSize(true);
        if (uuid) {
            try {
                const info = await ipc.send('query-asset-info', uuid);
                if (!info) {
                    console.warn('Open scene failed: The specified scenario file could not be found - ' + uuid);
                    uuid = '';
                } else {
                    await this._changeType(info.type);
                }
            } catch (error) {
                console.warn('Open scene failed: The specified scenario file could not be found - ' + uuid);
                uuid = '';
            }
        }

        // 如果打开的是预制件，则进入预制件处理流程
        if (this.type === 'cc.Prefab') {
            const prefab = await utils.loadPrefab(uuid);

            // 如果 prefab 存在，则进入打开流程，不存在则提示警告并且打开空场景
            if (prefab) {
                const scene = new cc.Scene();
                const node = cc.instantiate(prefab);
                node.parent = scene;
                this.prefab = node.uuid;
    
                currentSceneUuid = uuid;
    
                try {
                    await utils.loadSceneByNode(scene);
    
                    // 发送场景已经打开的消息修改消息
                    Manager.Ipc.send('set-scene', uuid);
                    Manager.Ipc.forceSend('broadcast', 'scene:ready', currentSceneUuid);

                    // 更新用于对比 dirty 的缓存以及 node 缓存和发送 open 事件
                    await nodeManager.init(cc.director._scene);
                    !this.ignore && this.emit('open', null, cc.director._scene);
                    currentSceneData = this.serialize();
                    return;
                } catch (error) {
                    console.error('Open prefab failed: ' + uuid);
                    console.error(error);
                    uuid = '';
                }
            }
        }

        // 如果打开的不是预制件，则肯定是场景

        // 关闭之前的场景
        currentSceneUuid = uuid;
        Manager.Ipc.forceSend('broadcast', 'scene:close');
        this.emit('close');

        // 如果 uuid 存在，则打开某个场景资源
        if (uuid) {
            try {
                await utils.loadSceneByUuid(uuid);

                // 发送场景已经打开的消息修改消息
                Manager.Ipc.send('set-scene', uuid);
                Manager.Ipc.forceSend('broadcast', 'scene:ready', currentSceneUuid);

                // 更新用于对比 dirty 的缓存以及 node 缓存和发送 open 事件
                await nodeManager.init(cc.director._scene);
                !this.ignore && this.emit('open', null, cc.director._scene);
                currentSceneData = this.serialize();

                return;
            } catch (error) {
                console.error('Open scene failed: ' + uuid);
                console.error(error);
                uuid = '';
            }
        }

        // 如果上述判断都不存在，则尝试打开空场景
        // 1. uuid 不存在
        // 2. 打开资源失败
        const fileUuid = await ipc.send('query-asset-uuid', 'db://internal/default_file_content/scene');
        const fileInfo = await ipc.send('query-asset-info', fileUuid);
        if (!existsSync(fileInfo.file)) {
            console.error('Open scene failed: template file is not exist.');
            return;
        }

        const fileContent = readFileSync(fileInfo.file);
        await utils.loadSceneByJson(fileContent);

        // 发送场景已经打开的消息修改消息
        Manager.Ipc.send('set-scene', uuid);
        Manager.Ipc.forceSend('broadcast', 'scene:ready', currentSceneUuid);

        // 更新用于对比 dirty 的缓存以及 node 缓存和发送 open 事件
        await nodeManager.init(cc.director._scene);
        !this.ignore && this.emit('open', null, cc.director._scene);
        currentSceneData = this.serialize();
    }

    /**
     * 关闭当前打开的场景
     */
    async close() {
        await new Promise((resolve) => {
            setTimeout(() => {
                currentSceneUuid = '';
                currentSceneData = null;
                // 发送节点修改消息
                Manager.Ipc.forceSend('broadcast', 'scene:close');
                !this.ignore && this.emit('close');
                resolve();
            }, 300);
        });
    }

    /**
     * 刷新当前场景并且放弃所有修改
     */
    async reload() {
        let uuid = currentSceneUuid;
        this.ignore = true;
        await close();
        await open(uuid);
        this.ignore = false;

        !this.ignore && this.emit('reload', null, cc.director._scene);
    }

    /**
     * 软刷新，备份当前场景的数据，并重启场景
     */
    async softReload() {
        const scene = cc.director.getScene();
        if (!scene) {
            return;
        }
        const json = Manager.Utils.serialize(scene);

        // 发送节点修改消息
        Manager.Ipc.forceSend('broadcast', 'scene:close');

        try {
            await utils.loadSceneByJson(json);
            await nodeManager.init(cc.director._scene);
            !this.ignore && this.emit('reload', null, cc.director._scene);
        } catch (error) {
            console.error('Open scene failed: ' + uuid);
            console.error(error);
            currentSceneData = null;
            !this.ignore && this.emit('reload', error, null);
        }

        if (currentSceneData) {
            // 发送节点修改消息
            Manager.Ipc.forceSend('broadcast', 'scene:ready', currentSceneUuid);
        }
    }

    /**
     * 保存场景
     */
    serialize() {
        if (this.type === 'cc.Scene') {
            let asset = new cc.SceneAsset();
            asset.scene = cc.director.getScene();
            return Manager.Utils.serialize(asset);
        } else {
            const node = nodeManager.query(this.prefab);
            const prefab = new cc.Prefab();
            const dump = prefabUtils.getDumpableNode(node);
            prefab.data = dump;
            return Manager.Utils.serialize(prefab);
        }
    }

    /**
     * 同步场景的序列化数据到缓存
     * 这个缓存用于判断 dirty 状态
     */
    syncSceneData() {
        currentSceneData = this.serialize();
    }

    /**
     * 查询节点数的信息
     * 传入 uuid 则以这个 uuid 指向的节点为根
     * 不传入则从场景开始
     * @param {*} uuid
     */
    queryNodeTree(uuid) {
        /**
         * 逐步打包数据
         * @param node
         */
        const step = (node) => {
            if (node._objFlags & cc.Object.Flags.HideInHierarchy) {
                return null;
            }

            const children = node._children.map(step).filter(Boolean);

            return {
                name: node.name || node.constructor.name,
                active: node.active,
                type: 'cc.' + node.constructor.name,
                uuid: node._id,
                children: children.length ? children : [],
                prefab: !!node._prefab,
                parent: (node.parent && node.parent.uuid) || '',
                isScene: node.constructor.name === 'Scene',
                readOnly: false, // TODO 暂时未使用到
            };
        };

        if (uuid) {
            const node = nodeManager.query(uuid);
            if (!node) {
                return null;
            }
            return step(node);
        }

        if (!cc.director._scene) {
            return null;
        }

        return step(cc.director._scene);
    }

    /**
     * 查询一个节点相对于场景的搜索路径
     * @param {*} uuid
     */
    queryNodePath(uuid) {
        let node = nodeManager.query(uuid);
        if (!node) {
            return '';
        }
        let names = [node.name];
        node = node.parent;
        while (node && !(node instanceof cc.Scene)) {
            if (!node) {
                break;
            }
            names.splice(0, 0, node.name);
            node = node.parent;
        }
        return names.join('/');
    }

    /**
     * 查询当前运行的场景是否被修改
     */
    queryDirty() {
        try {
            if (!currentSceneData) {
                return false;
            }

            if (this.serialize() === currentSceneData) {
                return false;
            }

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }

    }

    /**
     * 查询当前的组件列表
     */
    queryComponents() {
        return cc._componentMenuItems.map((item) => {
            return {
                name: item.priority !== -1 ? `cc.${item.component.name}` : item.component.name,
                priority: item.priority,
                path: item.menuPath,
            };
        });
    }

    /**
     * 缓存当前的场景
     * 只能缓存一份，并且只能缓存场景
     */
    async staging() {
        if (this._cache || this.type !== 'cc.Scene') {
            return;
        }

        const json = Manager.Utils.serialize(cc.director.getScene());
        this._cache = {
            uuid: currentSceneUuid,
            json,
            currentSceneData,
        };
    }

    /**
     * 还原之前缓存的场景
     * 并且清空缓存
     */
    async restore() {
        if (!this._cache) {
            return;
        }

        const cache = this._cache;
        this._cahce = null;
        currentSceneUuid = cache.uuid;
        currentSceneData = cache.currentSceneData;

        await utils.loadSceneByJson(cache.json);
        await nodeManager.init(cc.director._scene);
        !this.ignore && this.emit('reload', null, cc.director._scene);
    }

}

module.exports = new SceneManager();
