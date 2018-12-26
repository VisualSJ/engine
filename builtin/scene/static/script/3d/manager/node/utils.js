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

    SphereColliderComponent(component, node) {
        const boundingSize = getBoundingSize(node);
        component.radius = maxComponent(boundingSize);
    },

    BoxColliderComponent(component, node) {
        const boundingSize = getBoundingSize(node);
        const zeroX = boundingSize.x === 0 ? 1 : 0;
        const zeroY = boundingSize.y === 0 ? 1 : 0;
        const zeroZ = boundingSize.z === 0 ? 1 : 0;
        const sum = zeroX + zeroY + zeroZ;
        if (sum === 1) {
            const v = 0.00001;
            if (zeroX) {
                boundingSize.x = v;
            } else if (zeroY) {
                boundingSize.y = v;
            } else {
                boundingSize.z = v;
            }
        }
        component.size = boundingSize;
    },
};

function getBoundingSize(node) {
    const modelComponent = node.getComponent('cc.ModelComponent');
    if (!modelComponent) {
        return new cc.Vec3(0, 0, 0);
    }
    const { minPosition, maxPosition } = modelComponent.mesh;
    const size = new cc.Vec3();
    cc.vmath.vec3.subtract(size, maxPosition, minPosition);
    return size;
}

function maxComponent(v) {
    return Math.max(v.x, Math.max(v.y, v.z));
}