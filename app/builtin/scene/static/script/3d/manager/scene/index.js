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

        // 三种编辑模式
        // this.SceneMode = new SceneMode(this);
        // this.PrefabMode = new PrefabMode(this);
        // this.AnimationMode = new AnimationMode(this);

        // 次要的编辑模式（除场景外，场景是一个特殊存在）
        this.modes = [
            new SceneMode(this),
            new PrefabMode(this),
            new AnimationMode(this),
        ];

        this.modes.scene = this.modes[0];
        this.modes.prefab = this.modes[1];
        this.modes.animation = this.modes[2];
    }

    /**
     * 打开一个编辑模式
     * @param {String} name 模式的名字
     */
    async _pushMode(name, uuid) {
        let i;

        // 关闭优先级低的编辑模式
        for (i = this.modes.length - 1; i > 0; i--) {
            const current = this.modes[i];

            // 如果循环到打开的是这个模式，则停止
            if (current.name === name) {
                break;
            }

            // 尝试关闭该模式
            if (current.isOpen) {
                // 判断关闭是否失败，如果失败，则中断切换编辑模式流程
                if (!await current.close()) {
                    return false;
                }

                // 尝试还原上一级的编辑模式缓存
                await this.modes[i - 1].restore();
            }
        }

        // 缓存优先级更高的所有编辑模式数据
        for (let j = 0; j < i; j++) {
            const current = this.modes[j];
            if (current.isOpen) {
                await current.staging();
            }
        }

        // 如果还原失败（没有暂存），最后尝试打开新的场景
        if (await this.modes[i].open(uuid)) {
            Manager.Ipc.forceSend('broadcast', 'scene:change-mode', this.modes[i].name);
            return true;
        }

        return false;
    }

    /**
     * 关闭一个编辑模式
     * @param {String} name 模式的名字
     */
    async _popMode(name) {
        for (let i = this.modes.length - 1; i > 0; i--) {
            const current = this.modes[i];

            // 如果没传入名字，则关闭最后一个打开的编辑模式
            if (!name && current.isOpen) {
                name = current.name;
            }

            if (name !== current.name) {
                if (current.isOpen) {
                    console.warn(`Cannot close edit mode: ${name}`)
                    return false;
                }
                continue;
            }
            if (!current.isOpen) {
                console.warn(`Cannot close edit mode: ${name}`)
                return false;
            }
            if (await current.close()) {
                // 尝试还原上一级的编辑模式缓存
                await this.modes[i - 1].restore();
                Manager.Ipc.forceSend('broadcast', 'scene:change-mode', this.modes[i - 1].name);
                return true;
            }
            return false;
        }
    }

    /**
     * 清空所有的编辑模式
     */
    async _clearMode() {
        for (let i = this.modes.length - 1; i >= 0; i--) {
            const current = this.modes[i];
            if (!current.isOpen) {
                continue;
            }
            if (await current.close()) {
                // Manager.Ipc.forceSend('broadcast', 'scene:change-mode', this.modes[i - 1].name);
                return true;
            }
            return false;
        }
    }

    /**
     * 查询当前正在编辑的模式名字
     */
    queryMode() {
        for (let i = this.modes.length - 1; i >= 0; i--) {
            const current = this.modes[i];
            if (!current.isOpen) {
                continue;
            }
            return current.name;
        }
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
            await this._pushMode('prefab', uuid);
        } else {
            await this._pushMode('scene', uuid);
        }
    }

    /**
     * 关闭当前打开的场景
     */
    async close() {
        this._popMode();
    }

    /**
     * 刷新当前场景并且放弃所有修改
     */
    async reload() {
        for (let i = this.modes.length - 1; i >= 0; i--) {
            const current = this.modes[i];
            if (!current.isOpen) {
                continue;
            }
            return await current.reload();
        }
    }

    /**
     * 软刷新，备份当前场景的数据，并重启场景
     */
    async softReload() {
        for (let i = this.modes.length - 1; i >= 0; i--) {
            const current = this.modes[i];
            if (!current.isOpen) {
                continue;
            }
            return await current.softReload();
        }
    }

    /**
     * 保存场景
     */
    async serialize() {
        for (let i = this.modes.length - 1; i >= 0; i--) {
            const current = this.modes[i];
            if (!current.isOpen) {
                continue;
            }
            return await current.serialize();
        }
    }

    /**
     * 返回场景编辑里面的序列化数据
     */
    async mainSerialize() {
        return await this.modes[0].serialize();
    }

    /**
     * 保存场景
     */
    async save(url) {
        for (let i = this.modes.length - 1; i >= 0; i--) {
            const current = this.modes[i];
            if (!current.isOpen) {
                continue;
            }
            return await current.save(url);
        }
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
                components: node._components.map((comp) => {
                    return {
                        type: cc.js.getClassName(comp.constructor),
                        value: comp.uuid,
                    };
                }),
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
    dump() {
        const results = this.modes.map((mode) => {
            return mode.serialize();
        });
        return results;
    }

    /**
     * 从之前备份的数据内，还原场景状态
     * @param {*} dumps 
     */
    restore(dumps) {
        dumps.forEach((dump, index) => {
            const mode = this.modes[index];
            mode._staging = dump;
            mode.restore();
        });
    }
}

module.exports = new SceneManager();
