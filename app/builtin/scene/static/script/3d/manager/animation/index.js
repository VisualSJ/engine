'use strict';

const Scene = require('../scene');
const Node = require('../node');

const utils = require('./utils');

class AniamtionManager extends EventEmitter {

    /**
     * 打开一个节点的动画编辑模式
     * @param {*} uuid 
     */
    edit(uuid) {

    }

    /**
     * 退出当前正在运行的动画编辑模式
     *   1. 检查是否被修改
     *   2. 询问是否保存
     *   3. 处理保存，并返回是否成功的 bol
     * 如果没在，则不进行处理
     * 
     * @return {Boolean}
     */
    exit() {

    }

    /**
     * 查询一个节点所在的节点树上，带有动画组件的根节点
     * @param {String} uuid 节点 uuid
     */
    queryAnimationNode(uuid) {
        return utils.findRootAnimationNode(uuid);
    }
}

module.exports = new AniamtionManager();
