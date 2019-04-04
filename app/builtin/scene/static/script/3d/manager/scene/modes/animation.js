'use strict';

class AnimationMode {

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

}

module.exports = AnimationMode;
