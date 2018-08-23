'use strict';

declare const cc: any;

import { query } from '../manager/node';

/**
 * 生成一个 component 的 dump 数据
 * @param component
 */
export function dumpComponent(component: any) {
    const schema = component.constructor.schema;
    const result: any = {};
    for (const key in schema) {
        if (schema.hasOwnProperty(key)) {
            result[key] = dumpProperty(component[key], schema[key]);
        }
    }
    return result;
}

/**
 * 生成一个属性的 dump 数据
 * @param property
 */
export function dumpProperty(property: any, schema?: any): PropertyDump {
    const result: PropertyDump = {
        type: '',
        value: '',
        extends: [],
    };

    if (schema) {
        if ('default' in schema) {
            result.default = schema.default;
        }

        if ('options' in schema) {
            result.options = schema.options;
        }
    }

    const schemaType = schema ? schema.type : '';

    if (schemaType) {
        result.type = schemaType;
    } else if (property === null) {
        result.type = 'null';
    } else if (property.constructor && property.constructor.name) {
        result.type = property.constructor.name.toLocaleLowerCase();
    } else {
        result.type = (typeof property).toLocaleLowerCase();
    }

    // Entity
    if (result.type === 'entity' || result.type === 'level') {
        result.value = property._id;
        if (result.type !== 'entity') {
            result.extends.push('entity');
        }
    } else if (property instanceof cc.Component) {
        result.value = dumpComponent(property);
        if (result.type !== 'component') {
            result.extends.push('component');
        }
    } else if (property instanceof cc.Asset) {
        result.value = property._uuid;
        if (result.type !== 'asset') {
            result.extends.push('asset');
        }
    } else if (result.type === 'array') {
        result.value = property.map((item: any) => {
            return dumpProperty(item);
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
export function dumpNode(node: any): NodeDump {
    const children = [];

    for (const child of node._children) {
        if (!child) {
            break;
        }
        children.push(dumpNode(child));
    }

    return {
        uuid: dumpProperty(node._id),

        parent: dumpProperty(node.parent),
        active: dumpProperty(node.active),
        name: dumpProperty(node.name),
        layer: dumpProperty(node.layer),
        lpos: dumpProperty(node.lpos),
        lrot: dumpProperty(node.lrot),

        comps: dumpProperty(node._comps),

        children: dumpProperty(node._children),
    };
}

/**
 * 恢复一个 dump 数据到 component
 * @param dump
 * @param component
 */
export function restoreComponent(dump: any, component: any) {
    // todo
}

/**
 * 恢复一个 dump 数据到 property
 * @param dump
 * @param property
 */
export function restoreProperty(
    dump: PropertyDump,
    property: any,
    key: string
) {
    switch (dump.type) {
        case 'level':
        case 'entity':
            const node = query(dump.value);
            if (key === 'parent') {
                property.remove();
                node.append(property);
            } else {
                property[key] = node;
            }
            break;
        case 'vec3':
            property[key].x = dump.value.x;
            property[key].y = dump.value.y;
            property[key].z = dump.value.z;
            break;
        case 'quat':
            property[key].x = dump.value.x;
            property[key].y = dump.value.y;
            property[key].z = dump.value.z;
            property[key].w = dump.value.w;
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
export function restoreNode(dump: NodeDump, node: any) {
    restoreProperty(dump.active, node, 'active');
    // 恢复子节点只会恢复子节点的顺序
    // restoreProperty(dump.children, node, 'children');
    restoreProperty(dump.comps, node, '_comps');
    restoreProperty(dump.layer, node, 'layer');
    restoreProperty(dump.lpos, node, 'lpos');
    restoreProperty(dump.lrot, node, 'lrot');
    restoreProperty(dump.name, node, 'name');
    restoreProperty(dump.parent, node, 'parent');
    restoreProperty(dump.uuid, node, '_id');
}
