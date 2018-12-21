'use stirct';

const componentUtils = require('./component');

/**
 * 返回一个节点上基础属性的 dump 数据
 * @param {*} node
 */
function dump(node) {
    const position = node._lpos;
    const rotation = node.eulerAngles;
    const scale = node._lscale;

    const properties = {
        x: { default: 0, type: 'Float', visible: false },
        y: { default: 0, type: 'Float', visible: false },
        z: { default: 0, type: 'Float', visible: false },
    };

    let parentData = { type: '', value: { uuid: '' } };
    if (node.parent) {// 顶层节点 scene 的 parent = null
        parentData.type = node.parent.constructor.name;
        parentData.value.uuid = node.parent.uuid;
    }

    const dump = {
        __type__: 'cc.' + node.constructor.name, // cc.Node or cc.Scene
        __comps__: node._components.map((comp) => {
            return componentUtils.dump(comp);
        }),

        parent: parentData,
        children: {
            type: 'Array',
            itemType: 'cc.Node',
            value: node.children
                .map((child) => {
                    if (child._objFlags & cc.Object.Flags.HideInHierarchy) {
                        return null;
                    }
                    return { type: 'cc.Node', value: { uuid: child.uuid } };
                })
                .filter(Boolean),
        },

        uuid: { type: 'String', value: node.uuid },
        active: { type: 'Boolean', value: node.active },
        name: { type: 'String', value: node.name },
        position: {
            extends: ['cc.ValueType'],
            name: 'Vec3',
            type: 'cc.Vec3',
            properties,
            value: { x: position.x, y: position.y, z: position.z },
        },
        rotation: {
            extends: ['cc.ValueType'],
            name: 'Vec3',
            type: 'cc.Vec3',
            properties,
            value: { x: rotation.x, y: rotation.y, z: rotation.z },
        },
        scale: {
            extends: ['cc.ValueType'],
            name: 'Vec3',
            type: 'cc.Vec3',
            properties,
            value: { x: scale.x, y: scale.y, z: scale.z },
        },
    };

    if (node._prefab && node._prefab.asset) {
        dump.__prefab__ = {
            uuid: node._prefab.asset._uuid,
            rootName: node._prefab.root && node._prefab.root.name,
            rootUuid: node._prefab.root && node._prefab.root.uuid,
            sync: node._prefab.root && node._prefab.root._prefab.sync,
        };
    }

    return dump;
}

module.exports = {
    dump,
};
