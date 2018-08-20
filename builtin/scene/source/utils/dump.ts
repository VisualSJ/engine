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
            result[key] = dumpProperty(component[key], schema[key].type);
        }
    }
    return result;
}

/**
 * 生成一个属性的 dump 数据
 * @param property
 */
export function dumpProperty(property: any, schemaType?: string): PropertyDump {
    let type: string;
    let value: any;
    const extendArray: string[] = [];

    if (schemaType) {
        type = schemaType;
    } else if (property === null) {
        type = 'null';
    } else if (property.constructor && property.constructor.name) {
        type = property.constructor.name.toLocaleLowerCase();
    } else {
        type = (typeof property).toLocaleLowerCase();
    }

    // Entity
    if (type === 'entity' || type === 'level') {
        value = property._id;
        if (type !== 'entity') {
            extendArray.push('entity');
        }
    } else if (property instanceof cc.Component) {
        value = dumpComponent(property);
        if (type !== 'component') {
            extendArray.push('component');
        }
    } else if (property instanceof cc.Asset) {
        value = property._uuid;
        if (type !== 'asset') {
            extendArray.push('asset');
        }
    } else if (type === 'array') {
        value = property.map((item: any) => {
            return dumpProperty(item);
        });
    } else {
        value = property;
    }

    return {
        type,
        value,
        extends: extendArray
    };
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

        children: dumpProperty(node._children)
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
    // restoreProperty(dump.children, node, 'children');
    restoreProperty(dump.comps, node, '_comps');
    restoreProperty(dump.layer, node, 'layer');
    restoreProperty(dump.lpos, node, 'lpos');
    restoreProperty(dump.lrot, node, 'lrot');
    restoreProperty(dump.name, node, 'name');
    restoreProperty(dump.parent, node, 'parent');
    restoreProperty(dump.uuid, node, '_id');
}
