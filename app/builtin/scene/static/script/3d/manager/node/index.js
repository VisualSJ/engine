'use stirct';

/**
 * 节点管理器
 * 负责管理当前打开场景的 uuid 与节点对应关系
 */

const EventEmitter = require('../../../public/EventEmitter');
const { get } = require('lodash');
const utils = require('./utils');
const uuidUtils = require('../../../utils/uuid');
const compManager = require('./../component/index');
const { promisify } = require('util');

const Scene = require('../scene');

const dumpUtils = require('../../utils/dump');
const getComponentFunctionOfNode = require('../../utils/get-component-function-of-node');

const Reg_Uuid = /^[0-9a-fA-F-]{36}$/;
const Reg_NormalizedUuid = /^[0-9a-fA-F]{32}$/;
const Reg_CompressedUuid = /^[0-9a-zA-Z+/]{22,23}$/;

const supportTypes = ['cc.Prefab', 'cc.Mesh'];
let uuid2node = {};

/**
 * 节点管理器
 *
 * Events:
 *   node.on('before-change', (node) => {});
 *   node.on('before-add', (node) => {});
 *   node.on('before-remove', (node) => {});
 *   node.on('change', (node) => {});
 *   node.on('add', (node) => {});
 *   node.on('remove', (node) => {});
 */
class NodeManager extends EventEmitter {

    get supportTypes() {
        return supportTypes;
    }
    /**
     * 传入一个场景，将内部的节点全部缓存
     * @param {*} scene
     */
    init(scene) {
        if (!scene) {
            return;
        }

        uuid2node = {};
        utils.walk(scene, uuid2node);
        this.emit('inited', this.queryUuids(), scene);
    }

    /**
     * 清空当前管理的节点
     */
    clear() {
        uuid2node = {};
        compManager.clear();
    }

    /**
     * 添加一个节点到管理器内
     * @param {*} node
     */
    add(node) {
        uuid2node[node._id] = node;
        compManager.walkNode(node);
        // prefab 节点有子节点
        if (Array.isArray(node.children)) {
            node.children.forEach((child) => {
                this.add(child);
            });
        }
    }

    /**
     * 从管理器内移除一个指定的节点
     * @param {*} node
     */
    remove(node) {
        delete uuid2node[node._id];
        compManager.walkNode(node, 'remove');
    }

    /**
     * 查询一个节点的实例
     * @param {*} uuid
     * @return {cc.Node}
     */
    query(uuid) {
        return uuid2node[uuid] || null;
    }

    /**
     * 查询受管理的所有节点的 uuid 数组
     */
    queryUuids() {
        return Object.keys(uuid2node);
    }

    /**
     * 查询一个节点，并返回该节点的 dump 数据
     *   如果节点不存在，则返回 null
     * @param {String} uuid
     */
    queryDump(uuid) {
        let node = this.query(uuid);
        if (!node) {
            return null;
        }
        return dumpUtils.dumpNode(node);
    }

    /**
     * 设置一个节点的属性
     * @param {*} uuid
     * @param {*} path
     * @param {*} key
     * @param {*} dump
     */
    async setProperty(uuid, path, dump) {
        /**
         * 重要:
         * 节点的重命名通过属性变动来设置
         * 由于动画机制依赖节点名称
         * 所以动画模式下名称不能修改
         */
        if (path === 'name' && !this.canChangeNodetree()) {
            return;
        }

        // 多个节点更新值
        if (Array.isArray(uuid)) {
            uuid.forEach((id) => {
                this.setProperty(id, path, dump);
            });
            return;
        }
        const node = this.query(uuid);
        if (!node) {
            console.warn(`Set property failed: ${uuid} does not exist`);
            return;
        }

        // 触发修改前的事件
        this.emit('before-change', node);
        Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', uuid);
        if (path === 'parent' && node.parent) {
            // 发送节点修改消息
            Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', node.parent.uuid);
            this.emit('before-change', node.parent);
        }

        // 恢复数据
        await dumpUtils.restoreProperty(node, path, dump);

        // 触发修改后的事件
        this.emit('change', node, path);
        Manager.Ipc.forceSend('broadcast', 'scene:change-node', uuid);
        // 改变父子关系
        if (path === 'parent' && node.parent) {
            // 发送节点修改消息
            Manager.Ipc.forceSend('broadcast', 'scene:change-node', node.parent.uuid);
            this.emit('change', node.parent, 'children');
        }
        return true;
    }

    /**
     * 调整一个数组类型的数据内某个 item 的位置
     * @param uuid 节点的 uuid
     * @param path 数组的搜索路径
     * @param target 目标 item 原来的索引
     * @param offset 偏移量
     */
    moveArrayElement(uuid, path, target, offset) {
        if (!this.canChangeNodetree()) {
            return;
        }

        if (Array.isArray(uuid)) {
            uuid.forEach((id) => {
                this.moveArrayElement(id, path, target, offset);
            });
            return;
        }
        const node = this.query(uuid);
        if (!node) {
            console.warn(`Move property failed: ${uuid} does not exist`);
            return false;
        }

        // 因为 path 内的 __comps__ 实际指向的是 _components
        path = path.replace('__comps__', '_components');

        // 找到指定的 data 数据
        let data = path ? get(node, path) : node;
        if (!data) {
            console.warn(`Move property failed: ${uuid} does not exist`);
            return false;
        }

        if (!Array.isArray(data)) {
            console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
            return false;
        }

        // 发送节点修改消息
        this.emit('before-change', node);
        Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', uuid);

        // 移动顺序
        if (path === 'children') {
            // 过滤掉类似 Foreground Background 的节点
            const children = data.filter((child) => !(child._objFlags & cc.Object.Flags.HideInHierarchy));
            const child = children[target];

            // 找出要移动的节点在没有过滤掉隐藏节点的场景中的位置
            const index = data.indexOf(children[target + offset]);

            child.setSiblingIndex(index);
        } else {
            const temp = data.splice(target, 1);
            data.splice(target + offset, 0, temp[0]);
        }

        // 发送节点修改消息
        this.emit('change', node, path);
        Manager.Ipc.forceSend('broadcast', 'scene:change-node', uuid);

        return true;
    }

    /**
     * 删除一个数组元素
     * @param uuid 节点的 uuid
     * @param path 元素所在数组的搜索路径
     * @param index 目标 item 原来的索引
     */
    removeArrayElement(uuid, path, index) {
        if (!this.canChangeNodetree()) {
            return;
        }

        if (Array.isArray(uuid)) {
            uuid.forEach((id) => {
                this.removeArrayElement(id, path, index);
            });
            return;
        }
        const node = this.query(uuid);
        const key = (path || '').split('.').pop();

        if (key === 'children') {
            console.warn('Unable to change `children` of the parent, Please change the `parent` of the child');
            return false;
        }

        if (!node) {
            console.warn(`Move property failed: ${uuid} does not exist`);
            return false;
        }

        // 因为 path 内的 __comps__ 实际指向的是 _components
        path = path.replace('__comps__', '_components');

        // 找到指定的 data 数据
        let data = path ? get(node, path) : node;
        if (!data) {
            console.warn(`Move property failed: ${uuid} does not exist`);
            return false;
        }

        if (!Array.isArray(data)) {
            console.warn(`Move property failed: ${uuid} - ${path}.${key} isn't an array`);
            return false;
        }

        // 发送节点修改消息
        this.emit('before-change', node);
        Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', uuid);

        if (path === '_components') {
            const comp = data[index];
            this.removeComponent(comp.uuid);

        } else {
            // 删除某个 item
            data.splice(index, 1);
        }

        // 发送节点修改消息
        this.emit('change', node, path);
        Manager.Ipc.forceSend('broadcast', 'scene:change-node', uuid);

        return true;
    }

    /**
     * 创建一个组件并挂载到指定的 entity 上
     * @param uuid entity 的 uuid
     * @param component 组件的名字
     */
    createComponent(uuid, component) {
        if (Array.isArray(uuid)) {
            uuid.forEach((id) => {
                this.createComponent(id, component);
            });
            return;
        }
        const node = this.query(uuid);
        if (!node) {
            console.warn(`create component failed: ${uuid} does not exist`);
            return false;
        }

        if (component) {
            // 发送节点修改消息
            this.emit('before-change', node);
            this.emit('before-add-component', component, node);
            Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', uuid);

            const comp = node.addComponent(component); // 触发引擎上节点添加组件
            compManager.addComponent(comp); // 编辑器内的组件管理

            /**
             * HACK:
             * 本来 compManager.addComponent(comp); 来一个加一个就够了
             * 但现在引擎会根据 component 的依赖情况，自动添加它依赖但缺失的 components
             * 所以实际上一次产生了多个 components，且引擎不会有反馈
             * Hack 的做法是对此时的 node 再全部拉取一次 components
             */
            compManager.ensureNode(node);

            // 一些组件在添加的时候，需要执行部分特殊的逻辑
            if (comp.constructor && utils.addComponentMap[comp.constructor.name]) {
                utils.addComponentMap[comp.constructor.name](comp, node);
            }

            // 发送节点修改消息
            this.emit('change', node);
            Manager.Ipc.forceSend('broadcast', 'scene:change-node', uuid);
        } else {
            console.warn(`create component failed: ${component} does not exist`);
            return false;
        }
    }

    /**
     * 移除一个 entity 上的指定组件
     * @param uuid component 的 uuid
     */
    removeComponent(uuid) {
        const comp = compManager.query(uuid);
        if (!comp) {
            console.warn(`Remove Component failed: ${uuid} does not exist`);
            return false;
        }

        return compManager.removeComponent(comp);
    }

    /**
     * 创建一个新节点
     * @param {*} uuid
     * @param {*} name
     * @param {*} data
     */
    async createNode(uuid, name = 'New Node', dump) {
        if (!this.canChangeNodetree()) {
            return;
        }

        if (!cc.director._scene) {
            return;
        }

        let parent;
        if (uuid) {
            parent = this.query(uuid);
        } else {
            parent = cc.director._scene;
        }

        const node = new cc.Node();

        // 一般情况下是 dumpdata
        if (dump) {
            if (typeof dump === 'string') {
                // dump 为 uuid 的情况
                dump = this.queryDump(dump);
            }
            // 这几个属性不需要赋给一个新节点
            delete dump.uuid;
            delete dump.parent;
            delete dump.children;

            // 删除 components 里面多余的属性
            if (dump.__comps__.length > 0) {
                for (let i = 0; i < dump.__comps__.length; i++) {
                    delete dump.__comps__[i].value.uuid;
                    delete dump.__comps__[i].value.node;
                }
            }

            // 有 __prefab__ 数据的情况
            if (dump.__prefab__) {
                const root = parent._prefab ? parent._prefab.root : node;
                Object.assign(dump.__prefab__, {
                    rootUuid: root.uuid,
                });
            }

            await dumpUtils.restoreNode(node, dump);
        }

        if (name) {
            node.name = name;
        }

        this.emit('before-add', node);
        Manager.Ipc.forceSend('broadcast', 'scene:before-add-node', node.uuid);
        this.emit('before-change', parent);
        Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', uuid);

        parent.addChild(node);

        await this.add(node);

        // 发送节点修改消息
        this.emit('add', node);
        Manager.Ipc.forceSend('broadcast', 'scene:add-node', node.uuid);
        this.emit('change', parent);
        Manager.Ipc.forceSend('broadcast', 'scene:change-node', uuid);

        return node.uuid;
    }

    async restorePrefab(uuid, assetUuid) {
        if (!this.canChangeNodetree()) {
            return;
        }

        if (!cc.director._scene) {
            return;
        }

        const query = this.query;
        const current = query(uuid);

        const cacheChildrenUuid = {};
        function getChildrenUuid(node) {
            const rt = {};

            if (node) {
                if (cacheChildrenUuid[node.uuid]) {
                    return cacheChildrenUuid[node.uuid];
                }

                if (Array.isArray(node.children)) {
                    node.children.forEach((child, i) => {
                        if (child && child._prefab) {
                            rt[child._prefab.fileId] = child.uuid;
                        }
                    });
                    cacheChildrenUuid[node.uuid] = rt;
                }
            }
            return rt;
        }

        const cacheChildrenIndex = {};
        function getChildrenIndex(node) {
            const rt = {};

            if (node) {
                if (cacheChildrenIndex[node.uuid]) {
                    return cacheChildrenIndex[node.uuid];
                }

                if (Array.isArray(node.children)) {
                    node.children.forEach((child, i) => {
                        if (child && child._prefab) {
                            rt[child._prefab.fileId] = i;
                        }
                    });
                    cacheChildrenIndex[node.uuid] = rt;
                }
            }
            return rt;
        }

        async function restore(newNode, parentNode, prefabParent) {
            const fileId2Index = getChildrenIndex(parentNode); // 对应新数据上的子集排列
            const fileId2Uuid = getChildrenUuid(prefabParent); // 对应新数据上的 uuid

            const dump = dumpUtils.dumpNode(newNode);
            const fileId = dump.__prefab__.fileId;
            const prefab = prefabParent ? query(fileId2Uuid[fileId]) : current;

            if (prefab) {
                module.exports.emit('before-change', prefab);
                Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', prefab.uuid);

                // 删除掉不在新数据上的子节点
                if (Array.isArray(prefab.children)) {
                    const childrenFileId2Index = getChildrenIndex(newNode);

                    let index = 0;
                    let child = prefab.children[index];
                    while (child && index < prefab.children.length) {
                        if (childrenFileId2Index[child._prefab.fileId] === undefined) {
                            module.exports.removeNode(child.uuid);
                        } else {
                            index++;
                        }
                        child = prefab.children[index];
                    }
                }

                const prefabDump = dumpUtils.dumpNode(prefab);

                delete dump.uuid; // 删除不必要的字段
                delete dump.children;
                if (prefabParent) {
                    dump.parent.value.uuid = prefabParent.uuid;
                }
                // 使用原来的数据
                dump.__prefab__ = JSON.parse(JSON.stringify(prefabDump.__prefab__));
                await dumpUtils.restoreNode(prefab, dump);

                // 确保位置准确
                if (fileId2Index[fileId] !== undefined) {
                    prefab.setSiblingIndex(fileId2Index[fileId]);
                }

                // 逐层移动到目标节点上
                let index = 0;
                let childNode = newNode.children[index];
                while (childNode && index < newNode.children.length) {
                    const isMoved = await restore(childNode, newNode, prefab);
                    if (!isMoved) {
                        index++;
                    }
                    childNode = newNode.children[index];
                }

                module.exports.emit('change', prefab);
                Manager.Ipc.forceSend('broadcast', 'scene:change-node', prefab.uuid);

                // 没有移动
                return false;
            } else {
                module.exports.emit('before-add', newNode);
                Manager.Ipc.forceSend('broadcast', 'scene:before-add-node', newNode.uuid);
                module.exports.emit('before-change', prefabParent);
                Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', prefabParent.uuid);

                const index = fileId2Index[newNode._prefab.fileId];
                prefabParent.insertChild(newNode, index);
                // 需要替换关联信息
                newNode._prefab.root = prefabParent._prefab.root;

                module.exports.emit('add', newNode);
                Manager.Ipc.forceSend('broadcast', 'scene:add-node', newNode.uuid);
                module.exports.emit('change', prefabParent);
                Manager.Ipc.forceSend('broadcast', 'scene:change-node', prefabParent.uuid);

                // 有移动
                return true;
            }
        }

        try {
            const asset = await promisify(cc.AssetLibrary.loadAsset)(assetUuid);
            const newNode = cc.instantiate(asset);
            current.parent.addChild(newNode);
            await this.add(newNode); // 以上完整步骤增加临时节点
            await restore(newNode); // 逐层还原 prefab
            newNode.parent = null; // 删除临时节点

            this.emit('change', current);
            Manager.Ipc.forceSend('broadcast', 'scene:change-node', current.uuid);

        } catch (error) {
            console.error(error);
            return null;
        }
    }

    /**
     * 从一个资源创建对应的节点
     * @param {*} parentUuid
     * @param {*} assetUuid
     * @param {*} options { type: 资源类型, position: 位置坐标(vect3), name: 新的名字 }
     */
    async createNodeFromAsset(parentUuid, assetUuid, options) {
        if (!this.canChangeNodetree()) {
            return;
        }

        if (!cc.director._scene) {
            return;
        }

        let parent;
        if (parentUuid) {
            parent = this.query(parentUuid);
        } else {
            parent = cc.director._scene;
        }

        try {
            const asset = await promisify(cc.AssetLibrary.loadAsset)(assetUuid);
            let node;
            const { name, type, position } = options;

            if (!supportTypes.includes(type)) {
                return;
            }

            switch (type) {
                case 'cc.Prefab':
                    node = cc.instantiate(asset);
                    break;
                case 'cc.Mesh':
                    node = new cc.Node(asset.name);
                    const model = node.addComponent(cc.ModelComponent);
                    model.mesh = asset;
                    break;
            }

            if (position) {
                node.setPosition(position);
            }

            if (name) { // 使用创建时指定的名称
                node.name = name;
            }

            this.emit('before-add', node);
            Manager.Ipc.forceSend('broadcast', 'scene:before-add-node', node.uuid);
            this.emit('before-change', parent);
            Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', parentUuid);

            parent.addChild(node);

            // 爬取节点树上的所有节点数据
            await this.add(node);

            // 发送节点修改消息
            this.emit('add', node);
            Manager.Ipc.forceSend('broadcast', 'scene:add-node', node.uuid);
            this.emit('change', parent);
            Manager.Ipc.forceSend('broadcast', 'scene:change-node', parentUuid);

            return node.uuid;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    /**
     * 删除一个节点
     * @param {*} uuid
     */
    removeNode(uuid) {
        if (!this.canChangeNodetree()) {
            return;
        }

        const node = this.query(uuid);
        const parent = node.parent;

        // 发送节点修改消息
        this.emit('before-remove', node);
        Manager.Ipc.forceSend('broadcast', 'scene:before-remove-node', node.uuid);
        this.emit('before-change', parent);
        Manager.Ipc.forceSend('broadcast', 'scene:before-change-node', parent.uuid);

        parent.removeChild(node);

        // 发送节点修改消息
        this.emit('remove', node);
        Manager.Ipc.forceSend('broadcast', 'scene:remove-node', node.uuid);
        this.emit('change', parent);
        Manager.Ipc.forceSend('broadcast', 'scene:change-node', parent.uuid);

        return parent.uuid;
    }

    /**
     * 查询节点上所有组件上可运行的方法名
     * @param {*} uuid
     */
    queryComponentFunctionOfNode(uuid) {
        const node = this.query(uuid);

        if (!node) {
            return {};
        }
        return getComponentFunctionOfNode(node);
    }

    /**
     * 统一处理是否可以改变节点树的状态，增删改，重命名
     */
    canChangeNodetree() {
        // 目前动画模式下不允许变动
        const legeal = Scene.queryMode() !== 'animation';

        if (!legeal) {
            console.warn('In current editing mode, can not add, move, remove, rename nodes in the scene.');
        }

        return legeal;
    }
}

module.exports = new NodeManager();

Scene.on('open', (scene) => {
    module.exports.init(scene);
});
