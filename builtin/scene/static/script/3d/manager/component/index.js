// 存储组件 uuid 与组件对象的 map
const uuid2comp = {};

class CompManager {

    /**
     * 清空当前管理的节点
     */
    clear() {
        uuid2comp = {};
    }

    /**
     * 添加组件
     * @param {cc.Component} component
     */
    add(component) {
        uuid2comp[component.uuid] = component;
    }

    /**
     * 移除组件缓存
     * @param {*} uuid
     */
    remove(uuid) {
        delete uuid2comp[uuid];
    }

    /**
     * 查询一个组件的实例
     * @param {*} uuid
     * @returns {cc.Component}
     */
    query(uuid) {
        return uuid2comp[uuid] || null;
    }

    /**
     * 爬取节点上的组件数据,并缓存或移除
     * @param {*} node 节点对象
     * @param {*} operate 添加/移除（默认为添加）
     */
    walkNode(node, operate = 'add') {
        if (node._components.length === 0) {
            return;
        }
        for (let comp of node._components) {
            this[operate](comp);
        }
    }
}
module.exports = new CompManager();
