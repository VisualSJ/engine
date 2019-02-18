const { EventEmitter } = require('events');

// 存储组件 uuid 与组件对象的 map
const uuid2comp = {};

class CompManager extends EventEmitter {

    /**
     * 清空当前管理的节点
     */
    clear() {
        uuid2comp = {};
    }

    /**
     * 添加到组件缓存
     * @param {cc.Component} component
     */
    add(component) {
        uuid2comp[component.uuid] = component;
    }

    /**
     * 移除组件缓存
     * @param {cc.Component} component
     */
    remove(component) {
        delete uuid2comp[component.uuid];
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

    /**
     * 在编辑器中添加新的component
     * @param {*} component 组件
     */
    addComponent(component) {
        this.emit('component-added', component);
        this.add(component);
    }

    /**
     * 在编辑器中删除一个component
     * @param {*} component 组件
     */
    removeComponent(component) {
        this.emit('before-component-remove', component);
        component._destroyImmediate();
        component.node.removeComponent(component);
        this.emit('component-removed', component);
    }
}
module.exports = new CompManager();
