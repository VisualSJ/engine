'use strict';

const Mode = require('./mode');

class AnimationMode extends Mode {

    get name() {
        return 'animation';
    }

    constructor(...args) {
        super(...args);

        // 正在编辑的动画根节点 uuid
        this.root = '';
    }

    /**
     * 打开动画编辑模式
     * @param {String} uuid 动画节点的 uuid
     */
    async open(uuid) {

        this.root = uuid;

        // TODO 使用 dump 记录场景状态

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

        this.root = '';

        // TODO 还原场景状态

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
        Manager.Animation.save();
    }
}

module.exports = AnimationMode;
