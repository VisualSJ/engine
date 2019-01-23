'use strcit';

declare const cc: any;
declare const Manager: any;

import {
    INode,
    IProperty,
} from './interface';

import {
    fillDefaultValue,
    getDefault,
    getTypeInheritanceChain,
    parsingPath,
} from './utils';

// @ts-ignore
import { get } from 'lodash';

/**
 * 解码一个 dump 数据
 * @param dump
 * @param node
 */
export async function decodeNode(dump: INode, node?: any) {
    if (!dump) {
        return;
    }

    node = node || cc.Node();

    node.name = dump.name.value;
    node.active = dump.active.value;
    node.setPosition(dump.position.value);
    // @ts-ignore
    node.setRotationFromEuler(dump.rotation.value.x, dump.rotation.value.y, dump.rotation.value.z);
    node.setScale(dump.scale.value);

    if (dump.parent && dump.parent.value && dump.parent.value.uuid) {
        node.parent = Manager.Node.query(dump.parent.value.uuid);
    } else {
        node.parent = null;
    }

    if (dump.children && dump.children.length) {
        dump.children.forEach((childDump: any) => {
            const uuid = childDump.value.uuid;
            const child = Manager.Node.query(uuid);

            // 重要：过滤隐藏节点
            if (child._objFlags & cc.Object.Flags.HideInHierarchy) {
                return;
            }

            child.parent = null;
            child.parent = node;
        });
    } else {
        while (node.children.length) {
            node.children[0].parent = null;
        }
    }

    for (let i = 0; i < dump.__comps__.length; i++) {
        const componentDump = dump.__comps__[i];
        let component = node._components[i];

        if (!component) {
            component = node.addComponent(componentDump.type);
        }

        for (const key in componentDump.value) {
            if (!(key in componentDump.value)) {
                continue;
            }
            await decodePatch(key, componentDump.value[key], component);
        }
    }

    if (node.__prefab__) {
        const prefab = node.__prefab__;
        const root = Manager.Node.query(prefab.rootUuid);
        const info = new cc._PrefabInfo();
        info.asset = Manager.Utils.serialize.asAsset(prefab.uuid);
        info.root = root ? root : node;
        info.fileId = node.uuid;
        node._prefab = info;
    }

    return node;
}

/**
 * 解码一个 dump 补丁到指定的 node 上
 * @param path
 * @param dump
 * @param node
 */
export async function decodePatch(path: string, dump: any, node: any) {
    // 将 dump path 转成实际的 node search path
    const info = parsingPath(path);
    const parentInfo = parsingPath(info.search);

    if (
        info.key === 'enabledInHierarchy' ||
        info.key === '__scriptAsset' ||
        info.key === 'uuid'
    ) {
        return;
    }

    // 获取需要修改的数据
    const data = info.search ? get(node, info.search) : node;
    const parentData = parentInfo.search ? get(node, parentInfo.search) : node;

    // 如果 dump.value 为 null，则需要自动填充默认数据
    if (
        !('value' in dump) ||
        (dump.value === null && dump.type === 'Unknown')
    ) {
        let attr = cc.Class.attr(data, info.key);
        if (Array.isArray(parentData) && parentInfo.search !== '_components') {
            const grandInfo = parsingPath(parentInfo.search);
            const grandData = grandInfo.search ? get(node, grandInfo.search) : node;
            attr = cc.Class.attr(grandData, grandInfo.key);
            attr = cc.Class.attr(attr.ctor, info.key);
        }

        let value = getDefault(attr);

        if (typeof value === 'object' && value) {
            if (typeof value.clone === 'function') {
                value = value.clone();
            } else if (Array.isArray(value)) {
                value = [];
            } else {
                value = {};
            }
        } else if (attr.ctor) {
            value = new attr.ctor();
        }

        data[info.key] = value;

        return value;
    }

    // 获取数据的类型
    const ccType = cc.js.getClassByName(dump.type);
    const ccExtends = ccType ? getTypeInheritanceChain(ccType) : [];
    const nodeType = 'cc.Node';
    const assetType = 'cc.Asset';
    const valueType = 'cc.ValueType';

    // 实际修改数据
    if (ccExtends.includes(nodeType) || nodeType === dump.type) {
        if (!dump.value || !dump.value.uuid) {
            data[info.key] = null;
        } else {
            const node = Manager.Node.query(dump.value.uuid);
            if (info.key === 'parent') {
                node.addChild(data);
            } else {
                data[info.key] = node;
            }
        }
    } else if (dump.isArray) {
        const array: IProperty[] = (dump.value || []);
        await Promise.all(array.map(async (item: IProperty, index: number) => {
            return await decodePatch(`${path}.${index}`, item, data);
        }));
    } else if (ccExtends.includes(assetType) || assetType === dump.type) {
        if (!dump.value || !dump.value.uuid) {
            data[info.key] = null;
        } else {
            await new Promise((resolve, reject) => {
                cc.AssetLibrary.loadAsset(dump.value.uuid, (error: Error, asset: any) => {
                    data[info.key] = asset;
                    resolve();
                });
            });
        }
    } else if (ccExtends.includes(valueType) || valueType === dump.type) {
        Object.keys(dump.value).forEach((key: string) => {
            data[info.key][key] = dump.value[key];
        });
    } else if (info.key === 'length' && dump.type === 'Array') {
        while (data.length > dump.value) {
            data.pop();
        }
        const parentData = get(node, parentInfo.search);
        const attr = cc.Class.attr(parentData, parentInfo.key);
        fillDefaultValue(attr, data, data.length, dump.value);
    } else {
        data[info.key] = dump.value;
    }

    // 特殊属性
    switch (info.key) {
        case '_lpos':
            node.setPosition(node._lpos);
            break;
        case 'eulerAngles':
            node.setRotationFromEuler(node.eulerAngles.x, node.eulerAngles.y, node.eulerAngles.z);
            break;
        case '_lscale':
            node.setScale(node._lscale);
            break;
    }

    // 触发引擎内的 setter 更新部分数据
    data[info.key] = data[info.key];
    if (parentInfo && parentInfo.search) {
        const data = get(node, parentInfo.search);
        data[parentInfo.key] = data[parentInfo.key];
    }
}
