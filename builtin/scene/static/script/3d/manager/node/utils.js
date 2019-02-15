'use stirct';
const compManager = require('./../component/index');

/**
 * 爬取节点上的数据
 * @param children
 */
exports.walkChild = function(node, uuid2node) {
    uuid2node[node._id] = node;
    compManager.walkNode(node);
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
        const boundingBox = getBoundingBox(node);
        const boundingSize = getSize(boundingBox);

        component.radius = maxComponent(boundingSize);
        component.center = getCenter(boundingBox);
    },

    BoxColliderComponent(component, node) {
        const boundingBox = getBoundingBox(node);
        const boundingSize = getSize(boundingBox);

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
        component.center = getCenter(boundingBox);
    },
};

function getBoundingBox(node) {
    const modelComponent = node.getComponent('cc.ModelComponent');
    if (!modelComponent) {
        return {
            minPosition: new cc.Vec3(0, 0, 0),
            maxPosition: new cc.Vec3(0, 0, 0),
        };
    }
    return {
        minPosition: modelComponent.mesh.minPosition,
        maxPosition: modelComponent.mesh.maxPosition,
    };
}

function getSize(boundingBox) {
    const size = new cc.Vec3();
    cc.vmath.vec3.subtract(size, boundingBox.maxPosition, boundingBox.minPosition);
    return size;
}

function getCenter(boundingBox) {
    const size = getSize(boundingBox);
    const center = new cc.Vec3();
    cc.vmath.vec3.scaleAndAdd(center, boundingBox.minPosition, size, 0.5);
    return center;
}

function maxComponent(v) {
    return Math.max(v.x, Math.max(v.y, v.z));
}
