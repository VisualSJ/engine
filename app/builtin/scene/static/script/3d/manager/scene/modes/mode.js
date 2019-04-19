'use strict';

class Mode {

    constructor(manager) {
        this.manager = manager;
        this.isOpen = false;

        // 暂存的场景 json
        this._staging = null;
    }

    /**
     * 打开编辑模式
     */
    async open() {
        this.isOpen = true;
    }

    /**
     * 关闭编辑模式
     */
    async close() {
        this.isOpen = false;
    }

    /**
     * 重新加载编辑模式
     */
    async reload() {}

    /**
     * 重新软加载编辑模式
     */
    async softReload() {}

    /**
     * 获取当前正在编辑的资源的序列化数据
     */
    async serialize() {}

    /**
     * 查询是否被修改
     */
    async queryDirty() {
        return false;
    }

    /**
     * 保存编辑模式正在编辑的东西
     */
    async save() {}

    /**
     * 缓存编辑模式数据
     */
    async staging() {}

    /**
     * 还原编辑模式数据
     */
    async restore() {}

}

module.exports = Mode;
