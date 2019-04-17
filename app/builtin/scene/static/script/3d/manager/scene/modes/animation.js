'use strict';

const Mode = require('./mode');
const dumpEncode = require('../../../../../../dist/utils/dump/encode');
const dumpDecode = require('../../../../../../dist/utils/dump/decode');

class AnimationMode extends Mode {

    get name() {
        return 'animation';
    }

    constructor(...args) {
        super(...args);

        // 正在编辑的动画根节点 uuid
        this.root = '';
        this.recordDump = {};
    }

    walkNode(node, callBack) {
        callBack(node);
        node.children && node.children.forEach((child) => {
            this.walkNode(child, callBack);
        });
    }

    /**
     * 打开动画编辑模式
     * @param {String} uuid 动画节点的 uuid
     */
    async open(uuid) {

        this.root = uuid;
        this.recordDump = {};

        // dump 会被更改的node的信息
        let animRoot = Manager.Node.query(this.root);
        if (!animRoot) {
            return false;
        }

        this.walkNode(animRoot, (node) => {
            let nodeDump = dumpEncode.encodeNode(node);
            if (!nodeDump.__comps__) {
                return;
            }

            // 不记录 cc.Animation component，因为 cc.Animation 状态必须保留
            for (let i = 0; i < nodeDump.__comps__.length; i++) {
                if (nodeDump.__comps__[i].type === 'cc.AnimationComponent') {
                    nodeDump.__comps__.splice(i, 1);
                }
            }
            this.recordDump[node.uuid] = nodeDump;
        });

        // 发送 emit 事件
        this.manager.emit('animation-start', uuid);

        // 广播场景打开消息
        Manager.Ipc.forceSend('broadcast', 'scene:animation-start', uuid);

        return true;
    }

    /**
     * 关闭动画编辑模式
     */
    async close() {

        // 还原数据
        let animRoot = Manager.Node.query(this.root);
        if (!animRoot) {
            return false;
        }

        if (!this.recordDump) {
            return false;
        }

        this.walkNode(animRoot, (node) => {
            let nodeDump = this.recordDump[node.uuid];
            dumpDecode.decodeNode(nodeDump, node);
            Manager.Node.emit('change', node);
            Manager.Ipc.send('broadcast', 'scene:change-node', node.uuid);
        });

        this.root = '';

        // 发送 emit 事件
        this.manager.emit('animation-end');

        // 广播场景关闭消息
        Manager.Ipc.forceSend('broadcast', 'scene:animation-end');

        return true;
    }

    /**
     * 重新加载动画编辑模式
     */
    async reload() {
        // TODO 动画编辑模式也许不需要刷新方法
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
     * 重新软加载动画编辑模式
     */
    async softReload() {
        return true;
    }

    /**
     * 获取当前正在编辑的资源的序列化数据
     */
    async serialize() {
        return Manager.Animation.getSerializedEditClip();
    }

    /**
     * 保存 clip 数据
     */
    async save() {
        // TODO 使用 save-asset 消息，进行保存

        // const newData = this.serialize();
        // await Manager.Ipc.send('save-asset', this.current, newData);
        return Manager.Animation.save();
    }
}

module.exports = AnimationMode;
