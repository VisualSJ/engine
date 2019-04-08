'use strict';

class Mode {

    constructor(manager) {
        this.manager = manager;
    }

    /**
     * 打开编辑模式
     */
    async open() {}

    /**
     * 关闭编辑模式
     */
    async close() {}

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
     * 保存场景
     */
    async save() {}

}

module.exports = Mode;
