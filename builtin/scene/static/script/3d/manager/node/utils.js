'use stirct';

/**
 * 爬取节点上的数据
 * @param children
 */
exports.walkChild = function(node, uuid2node) {
    uuid2node[node._id] = node;
    node.children && node.children.forEach((child) => {
        exports.walkChild(child, uuid2node);
    });
};

/**
 * 爬取 engine 内打开的场景的节点数据
 * @param {*} scene
 */
exports.walk = function(scene, uuid2node) {
    exports.walkChild(scene, uuid2node);
};

/**
 * 添加组件对应的内部处理方法
 */
exports.addComponentMap = {
    /**
     * 添加 Skybox 组件
     */
    SkyboxComponent(comp, node) { },
};
