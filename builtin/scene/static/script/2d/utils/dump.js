'use strict';

const { types, getTypeId, getDefault, getInheritanceChain } = require('./types');
const { query } = require('../manager/scene');

/**
 * 生成一个 component 的 dump 数据
 * @param component
 */
function dumpComponent(component, options) {
    const props = options.klass.__props__;
    const result = {};

    props.forEach((key) => {
        // if (!component.hasOwnProperty(key)) {
        //     return;
        // }
        result[key] = dumpProperty(component[key], {
            klass: options.klass,
            name: key,
            target: component,
        });
    });

    return result;
}

/**
 * 查询一个属性的数据
 * @param {*} attrs
 */
function dumpAttr(attrs) {
    const data = {};

    if (attrs.hasOwnProperty('type')) {
        data.type = attrs.type;
    }

    if (attrs.hasOwnProperty('readonly')) {
        data.readonly = attrs.readonly;
    }

    if (attrs.hasOwnProperty('default')) {
        data.default = getDefault(attrs.default);
        if (attrs.saveUrlAsAsset && data.default === '') {
            data.default = null;
        } else if (data.default != null && !data.type) {
            // 为 inspector 提供类型信息
            let type = ({
                number: 'Float',
                string: 'String',
                boolean: 'Boolean',
                object: 'Object'
            })[typeof data.default];

            if (type) {
                if (type !== 'Object' || data.default.constructor === Object) {
                    data.type = type;
                } else {
                    let defaultType = cc.js._getClassId(data.default.constructor);
                    if (defaultType) {
                        data.type = defaultType;
                    }
                }
            }
        }
    } else if (!attrs.hasSetter) {
        data.readonly = true;
    }

    if (attrs.hasOwnProperty('visible')) {
        data.visible = attrs.visible;
    }
    if (attrs.hasOwnProperty('enumList')) {
        // we should deep copy every js object otherwise can not using in ipc
        data.enumList = JSON.parse(JSON.stringify(attrs.enumList));
    }
    if (attrs.hasOwnProperty('displayName')) {
        data.displayName = attrs.displayName;
    }
    if (attrs.hasOwnProperty('multiline')) {
        data.multiline = attrs.multiline;
    }
    if (attrs.hasOwnProperty('min')) {
        data.min = attrs.min;
    }
    if (attrs.hasOwnProperty('max')) {
        data.max = attrs.max;
    }
    if (attrs.hasOwnProperty('step')) {
        data.step = attrs.step;
    }
    if (attrs.hasOwnProperty('slide')) {
        data.slide = attrs.slide;
    }
    if (attrs.hasOwnProperty('nullable')) {
        data.nullable = attrs.nullable;
    }
    if (attrs.hasOwnProperty('tooltip')) {
        data.tooltip = attrs.tooltip;
    }
    if (attrs.hasOwnProperty('animatable')) {
        data.animatable = attrs.animatable;
    }

    return data;
}

/**
 * 生成一个属性的 dump 数据
 * @param property
 */
function dumpProperty(property, options) {
    const result = {
        type: '',
        value: '',
    };

    // 拿出当前类型的 attr 定义数据
    const attr = cc.Class.attr(options.klass, options.name);

    // 判断当前的类型，如果 options 没有 name 字段，则说明是正在序列化一个 Compoennt
    let propertyType;
    if (!options.name) {
        propertyType = cc.js._getClassId(options.klass);
    } else if (attr.ctor) {
        propertyType = cc.js._getClassId(attr.ctor);
    } else if (property && property.constructor) {
        propertyType = cc.js._getClassId(property.constructor);
    }

    // 设置 type
    if (propertyType) {
        result.type = propertyType;
    } else if (Array.isArray(property)) {
        result.type = 'Array';
    } else {
        result.type = (typeof property).replace(/^\S/, (str) => {
            return str.toUpperCase();
        });
    }

    // 取出序列化数据的构造函数
    let ctor = attr.ctor || ((property && typeof property === 'object') ? property.constructor : property);

    // 如果数据有继承链，则生成 extends 数组
    if (ctor) {
        const chain = getInheritanceChain(ctor);
        if (chain.length > 0) {
            result.extends = chain;
        }
    }

    // 如果数据有可循环的 properties 数据，则生成对应的规则
    if (ctor && ctor.__props__) {
        let properties = {};
        ctor.__props__.forEach((name) => {
            let childAttr = cc.Class.attr(ctor, name);
            properties[name] = childAttr ? dumpAttr(childAttr) : {};
        });
        if (
            cc.js.isChildClassOf(ctor, cc._BaseNode) ||
            cc.js.isChildClassOf(ctor, cc.Component)
        ) {
            properties._id = {
                type: cc.String,
                visible: false
            };
        }
        result.properties = properties;
    }

    // 如果序列化数据是一个 Node
    if (cc.js.isChildClassOf(ctor, cc.Node)) {
        result.value = property._id;
    } else if (cc.js.isChildClassOf(ctor, cc.Component)) {
        result.value = dumpComponent(property, { klass: options.klass });
    } else if (cc.js.isChildClassOf(ctor, cc.Asset)) {
        result.value = property ? property._uuid : null;
    } else if (result.type === 'Array') {
        result.value = property.map((item) => {
            return dumpProperty(item, {
                klass: item.constructor,
            });
        });
    } else if (ctor && ctor.__props__) {
        result.value = {};
        ctor.__props__.forEach((name) => {
            result.value[name] = property[name];
        });
    } else {
        result.value = property;
    }

    return result;
}

/**
 * 生成一个 node 的 dump 数据
 * @param node
 */
function dumpNode(node) {
    const dump = {
        uuid: dumpProperty(node._id, { klass: cc.Node, name: '_id', target: node }),

        active: dumpProperty(node.active, { klass: cc.Node, name: 'active', target: node }),
        name: dumpProperty(node.name, { klass: cc.Node, name: 'name', target: node }),

        position: dumpProperty(new cc.Vec3(node.x, node.y, node.z), { klass: cc.Node, name: 'position', target: node }),
        rotation: dumpProperty(node.rotation, { klass: cc.Node, name: 'rotation', target: node }),
        scale: dumpProperty(new cc.Vec2(node.scaleX, node.scaleY), { klass: cc.Node, name: 'scale', target: node }),
        anchor: dumpProperty(new cc.Vec2(node.anchorX, node.anchorY), { klass: cc.Node, name: 'anchor', target: node }),
        size: dumpProperty(new cc.Size(node.width, node.height), { klass: cc.Node, name: 'size', target: node }),
        color: dumpProperty(node.color, { klass: cc.Node, name: 'color', target: node }),
        opacity: dumpProperty(node.opacity, { klass: cc.Node, name: 'opacity', target: node }),
        skew: dumpProperty(new cc.Vec2(node.skewX, node.skewY), { klass: cc.Node, name: 'skew', target: node }),
        group: dumpProperty(node.group, { klass: cc.Node, name: 'group', target: node }),

        parent: dumpProperty(node.parent, { klass: cc.Node, name: 'parent', target: node }),
        children: dumpProperty(node._children, { klass: cc.Node, name: '_children', target: node }),

        __comps__: dumpProperty(node._components, { klass: cc.Node, name: '_components', target: node }),
    };

    return dump;
}

/**
 * 恢复一个 dump 数据到 component
 * @param dump
 * @param component
 */
function restoreComponent(dump, component) {
    // todo
}

/**
 * 恢复一个 dump 数据到 property
 * @param dump
 * @param property
 */
function restoreProperty(dump, property, key) {
    switch (dump.type) {
        case 'cc.Scene':
        case 'cc.Node':
            const node = query(dump.value);
            if (key === 'parent') {
                property.remove();
                node.appendChild(property);
            } else {
                property[key] = node;
            }
            break;
        case 'cc.Vec3':
            property[key].x = dump.value.x;
            property[key].y = dump.value.y;
            property[key].z = dump.value.z;
            break;
        case 'cc.Vec2':
            property[key].x = dump.value.x;
            property[key].y = dump.value.y;
            break;
        case 'cc.Color':
            property[key].r = dump.value.r;
            property[key].g = dump.value.g;
            property[key].b = dump.value.b;
            property[key].a = dump.value.a;
            break;
        default:
            property[key] = dump.value;
    }
}

/**
 * 恢复一个 dump 数据到 node
 * @param dump
 * @param node
 */
function restoreNode(dump, node) {
    restoreProperty(dump.uuid, node, '_id');

    restoreProperty(dump.active, node, 'active');
    restoreProperty(dump.name, node, 'name');

    restoreProperty(dump.position, node, 'position');
    restoreProperty(dump.rotation, node, 'rotation');
    restoreProperty(dump.scale, node, 'scale');
    restoreProperty(dump.anchor, node, 'anchor');
    restoreProperty(dump.size, node, 'size');
    restoreProperty(dump.color, node, 'color');
    restoreProperty(dump.opacity, node, 'opacity');
    restoreProperty(dump.skew, node, 'skew');
    restoreProperty(dump.group, node, 'group');

    restoreProperty(dump.comps, node, '_components');
    restoreProperty(dump.parent, node, 'parent');
    // 恢复子节点只会恢复子节点的顺序
    // restoreProperty(dump.children, node, '_children');

    throw new Error('asdf');
}

module.exports = {
    dumpComponent,
    dumpProperty,
    dumpNode,
    restoreComponent,
    restoreProperty,
    restoreNode,
};
