'use strict';

const EventEmitter = require('../../../public/EventEmitter');

const ipc = require('../ipc');

const SceneMode = require('./modes/scene');
const PrefabMode = require('./modes/prefab');
const AnimationMode = require('./modes/animation');

/**
 * 场景管理器
 *
 * Events:
 *   scene.on('open', (error, scene) => {});
 *   scene.on('close', (error) => {});
 *   scene.on('reload', (error, scene) => {});
 */
class SceneManager extends EventEmitter {

    constructor() {
        super();
        this.ignore = false;

        // 必须存在的编辑模式
        this.SceneMode = new SceneMode(this);
        // 可能存在的编辑模式
        this.PrefabMode = new PrefabMode(this);
        this.AnimationMode = new AnimationMode(this);

        // 编辑模式
        this.modes = {
            main: this.SceneMode,
            minor: null,
        };
    }

    /**
     * 打开一个编辑模式
     * @param {*} mode
     */
    async _pushMode(mode, uuid) {
        // 如果推入的是一个场景
        if (mode === this.SceneMode) {
            // 首先尝试关闭次要编辑
            if (this.modes.minor) {
                if (!await this.modes.minor.close()) {
                    return false; // 取消关闭
                }

                this.modes.minor = null;
            }

            // 还原暂存的场景
            if (await this.modes.main.restore()) {
                Manager.Ipc.forceSend('broadcast', 'scene:change-mode', mode.name);
                return true;
            }

            // 最后打开新的场景失败
            if (!await mode.open(uuid)) {
                return false;
            }

            Manager.Ipc.forceSend('broadcast', 'scene:change-mode', mode.name);
            return true;
        }

        // 缓存场景编辑状态
        if (!this.modes.minor) {
            await this.modes.main.staging();
        }

        // 尝试关闭次要编辑，如果失败，则不打开新的编辑模式
        if (this.modes.minor && !await this.modes.minor.close()) {
            return false;
        }

        // 尝试打开新的编辑模式，如果打开失败，则退回场景编辑
        this.emit('before-minor');
        if (!await mode.open(uuid)) {
            await this.modes.main.restore();
            return false;
        }

        Manager.Ipc.forceSend('broadcast', 'scene:change-mode', mode.name);
        this.modes.minor = mode;
        return true;
    }

    /**
     * 关闭一个编辑模式
     */
    async _popMode() {
        // 尝试关闭次要编辑，如果失败
        if (this.modes.minor && !await this.modes.minor.close()) {
            return false;
        }

        this.modes.minor = null;

        Manager.Ipc.forceSend('broadcast', 'scene:change-mode', 'scene');

        return true;
    }

    /**
     * 清空所有的编辑模式
     */
    async _clearMode() {
        // 尝试关闭次要编辑
        if (this.modes.minor && !await this.modes.minor.close()) {
            return false;
        }
        await this.modes.main.restore();
        // 尝试关闭主要编辑
        if (!await this.modes.main.close()) {
            return false;
        }
        return true;
    }

    /**
     * 查询当前正在编辑的模式名字
     */
    queryMode() {
        if (!this.modes.minor) {
            return 'scene';
        }
        if (this.modes.minor === this.AnimationMode) {
            return 'animation';
        }
        return 'prefab';
    }

    /**
     * 打开一个场景资源
     * @param {*} uuid 场景资源的 uuid
     */
    async open(uuid) {
        let type = 'cc.Scene';
        // 判断传入的 uuid 是否存在，类型是 prefab 还是 scene
        if (uuid) {
            try {
                const info = await ipc.send('query-asset-info', uuid);
                if (!info) {
                    console.warn('Open scene failed: The specified scenario file could not be found - ' + uuid);
                    uuid = '';
                } else {
                    type = info.type;
                }
            } catch (error) {
                console.warn('Open scene failed: The specified scenario file could not be found - ' + uuid);
                uuid = '';
            }
        }

        if (type === 'cc.Prefab') {
            await this._pushMode(this.PrefabMode, uuid);
        } else {
            await this._pushMode(this.SceneMode, uuid);
        }
    }

    /**
     * 关闭当前打开的场景
     */
    async close() {
        if (await this._popMode()) {
            return await this.modes.main.restore();
        }
        return await this.modes.main.close();
    }

    /**
     * 刷新当前场景并且放弃所有修改
     */
    async reload() {
        if (this.modes.minor) {
            return await this.modes.minor.reload();
        }
        return await this.modes.main.reload();
    }

    /**
     * 软刷新，备份当前场景的数据，并重启场景
     */
    async softReload() {
        if (this.modes.minor) {
            return await this.modes.minor.softReload();
        }
        return await this.modes.main.softReload();
    }

    /**
     * 保存场景
     */
    async serialize() {
        if (this.modes.minor) {
            return await this.modes.minor.serialize();
        }
        return await this.modes.main.serialize();
    }

    /**
     * 返回场景编辑里面的序列化数据
     */
    async mainSerialize() {
        return await this.modes.main.serialize();
    }

    /**
     * 保存场景
     */
    async save(url) {
        if (this.modes.minor) {
            return await this.modes.minor.save(url);
        }
        return await this.modes.main.save(url);
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
                readonly: false,
            };
        };

        if (uuid) {
            const node = Manager.Node.query(uuid);
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
     * 查询当前运行的场景是否被修改
     */
    queryDirty() {
        // try {
        //     if (!currentSceneData) {
        //         return false;
        //     }

        //     if (this.serialize() === currentSceneData) {
        //         return false;
        //     }

        //     return true;
        // } catch (error) {
        //     console.error(error);
        //     return false;
        // }

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
     * 序列化当前的场景编辑器状态
     */
    async dump() {
        const result = {
            scene: await this.SceneMode.serialize(),
            prefab: await this.PrefabMode.serialize(),
            animation: await this.AnimationMode.serialize(),
        };

        return result;
    }

    /**
     * 从之前备份的数据内，还原场景状态
     * @param {*} dump 
     */
    restore(dump) {
        this.SceneMode._staging = dump.scene;
        this.SceneMode.restore();
        // this.PrefabMode._staging = dump.prefab;
        // this.PrefabMode.restore();
        // this.AnimationMode._staging = dump.animation;
        // this.AnimationMode.restore();
    }
}

module.exports = new SceneManager();
