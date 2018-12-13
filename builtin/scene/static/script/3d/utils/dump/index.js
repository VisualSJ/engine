'use strict';

const { get } = require('lodash');
const nodeUtils = require('./node');
const isChildClass = require('../is-child-class');

/**
 * 获取一个数据的默认值
 * @param {*} attrs
 * @param {*} array
 * @param {*} start
 * @param {*} end
 */
function fillDefaultValue(attrs, array, start, end) {
    const DefaultMap = {
        Boolean: false,
        String: '',
        Float: 0,
        Integer: 0,
    };

    let val = attrs.saveUrlAsAsset ? '' : DefaultMap[attrs.type];

    if (val !== undefined) {
        for (let i = start; i < end; i++) {
            array[i] = val;
        }

        return;
    }

    switch (attrs.type) {
        case 'Enum': {
            const list = attrs.enumList;
            val = (list[0] && list[0].value) || 0;
            for (let i = start; i < end; i++) {
                array[i] = val;
            }
            break;
        }
        case 'Object': {
            const { ctor: Ctor } = attrs;

            if (isChildClass(Ctor, cc.Asset, cc.Node, cc.Component)) {
                for (let i = start; i < end; i++) {
                    array[i] = null;
                }
                break;
            } else {
                for (let i = start; i < end; i++) {
                    try {
                        array[i] = new Ctor();
                    } catch (err) {
                        console.error(err);
                        array[i] = null;
                    }
                }

                break;
            }
        }
        default:
            break;
    }
}

/**
 * 生成一个 node 的 dump 数据
 * @param {*} node
 */
function dumpNode(node) {
    if (!node) {
        return null;
    }

    return nodeUtils.dump(node);
}

/**
 * 恢复一个 dump 数据到 property
 * @param dump
 * @param property
 */
async function restoreProperty(node, path, dump) {
    let key;
    let keys;
    let spath;
    let property;
    if (typeof path === 'string') {
        // dump 的时候将 _components 转成了 __comps__
        path = path.replace('__comps__', '_components'); // TODO: 这个好像下文没用到，__comps__ 已单独处理

        // path 如果是是 position.x || position.y 实际修改的应该是 node._lpos.x || node._lpos.y
        path = path.replace('position', '_lpos');
        // 如果修改的是 scale.x || scale.y 实际修改的应该是 node._scale.x || node._scale.y
        path = path.replace('scale', '_lscale');
        // 如果修改的是 rotation.x || rotation.y 实际修改的应该是 node._euler.x || node._euler.y
        path = path.replace('rotation', '_euler');

        keys = (path || '').split('.');
        key = keys.pop();
        spath = keys.join('.');
        property = spath ? get(node, spath) : node;
    } else {
         key = path;
         property = node;
    }

    if (key === 'length' && Array.isArray(property)) {
        // 修改数组长度需要取上一层的 key 才能有对应的 attr
        const subKey = keys.pop();
        const subPath = keys.join('.');
        const subProperty = subPath ? get(node, subPath) : node;
        const attr = cc.Class.attr(subProperty, subKey);
        const array = subProperty[subKey];

        const oldLength = array.length;
        const { value } = dump;

        array.length = value;
        fillDefaultValue(attr, array, oldLength, value);
        return;
    }

    switch (dump.type) {
        case 'cc.Scene':
        case 'cc.Node':
            const nodeManaer = require('../../manager/node');
            const node = nodeManaer.query(dump.value.uuid);
            if (key === 'parent') {
                node.addChild(property);
            } else {
                property[key] = node;
            }
            break;
        case 'cc.Vec3': //TODO: 是否需要 cc. 开头
            if (key) {
                property[key].x = dump.value.x;
                property[key].y = dump.value.y;
                property[key].z = dump.value.z;
            } else {
                property.x = dump.value.x;
                property.y = dump.value.y;
                property.z = dump.value.z;
            }
            break;
        case 'cc.Vec2':
            if (key === 'scale') {
                property.scaleX = dump.value.x;
                property.scaleY = dump.value.y;
                break;
            } else if (key === 'anchor') {
                property.anchorX = dump.value.x;
                property.anchorY = dump.value.y;
                break;
            } else if (key === 'skew') {
                property.skewX = dump.value.x;
                property.skewY = dump.value.y;
                break;
            }

            if (key) {
                property[key].x = dump.value.x;
                property[key].y = dump.value.y;
            } else {
                property.x = dump.value.x;
                property.y = dump.value.y;
            }
            break;
        case 'cc.Size':
            if (key === 'size') {
                property.width = dump.value.width;
                property.height = dump.value.height;
                break;
            }

            if (key) {
                property[key].width = dump.value.width;
                property[key].height = dump.value.height;
            } else {
                property.width = dump.value.width;
                property.height = dump.value.height;
            }
            break;
        case 'cc.Color':
            // 3d opacity、color 由 effect 控制，无需更改 opacity
            const { a, r, g, b } = dump.value;
            property[key] = new cc.Color(r, g, b, a * 255);
            // property.opacity = Math.floor(opacity * 255);
            break;
        case 'cc.Mesh':
        case 'cc.SpriteFrame':
        case 'cc.Texture2D':
        case 'cc.Texture':
        case 'cc.Material':
        case 'cc.Asset':
        case 'cc.Skeleton':
        case 'cc.TextureCube':
        case 'cc.AnimationClip':
        case 'cc.Script':
            if (!dump.value.uuid) {
                property[key] = null;
                break;
            }
            await new Promise((resolve, reject) => {
                cc.AssetLibrary.loadAsset(dump.value.uuid, (err, asset) => {
                    property[key] = asset;
                    resolve();
                });
            });
            break;
        case 'Array': {
            await Promise.all(dump.value.map(async (item, index) => {
                return await restoreProperty(property[key], index, item);
            }));

            property[key].length = dump.value.length;
            break;
        }
        case 'cc.Enum':
        case 'Enum': {
            if (!isNaN(Number(dump.value))) {
                dump.value -= 0;
            }
        }

        default:
            property[key] = dump.value;
    }

    switch (path) {
        case '_lpos':
            node.setPosition(node._lpos);
            break;
        case '_euler':
            node.setRotationFromEuler(node._euler.x, node._euler.y, node._euler.z);
            break;
        case '_lscale':
            node.setScale(node._lscale);
            break;
    }

    // 如果修改的是数组内的属性，应该把数组重新赋值一次，用于触发引擎的 setter
    if (Array.isArray(property) && spath) {
        const index = spath.lastIndexOf('.');
        const arrayPath = spath.substr(0, index);
        const data = get(node, arrayPath);
        data[spath.substr(index + 1)] = property;
    }
}

/**
 * 还原一个节点的全部属性
 * @param {*} node
 * @param {*} dumpdata
 */
async function restoreNode(node, dumpdata) {
    for (const path in dumpdata) {
        if (!(path in dumpdata)) {
            continue;
        }

        const data = dumpdata[path];

        if (['__type__', 'group'].includes(path)) {
            continue;
        } else if (path === '__comps__') {
            for (let i = 0, ii = data.length; i < ii; i++) {
                await restoreComponent(node._components[i], data[i]);
            }
        } else if (path === 'uuid') {
            if (node.uuid !== data.value) {
                console.error(`node.uuid is '${node.uuid}' not the same as the data.value '${data.value}'.`);
            }
            continue;
        } else if (path === 'parent') {
            const nodeManaer = require('../../manager/node');
            node.parent = nodeManaer.query(data.value.uuid);
        } else if (path === 'children') {
            const uuids = data.value.map((one) => one.value.uuid); // 没有 children 的情况，map 后 uuids = []，需要有这个空数组
            resetNodeChildren(node, uuids);
        } else {
            if (node instanceof cc.Scene) {
                continue;
            }
            await restoreProperty(node, path, data);
        }
    }
}

/**
 * 还原一个节点内部组件属性
 * @param {*} node
 * @param {*} compos
 */
async function restoreComponent(component, compos) {
    const { value } = compos;

    for (const path in value) {
        if (!(path in value)) {
            continue;
        }

        const property = compos.properties[path];
        if (property.readonly === true || property.visible === false) {
            continue;
        }
        await restoreProperty(component, path, value[path]);
    }
}

/**
 * 重设节点的 children
 * 来自 redo undo 的重置
 */
function resetNodeChildren(parentNode, childrenIds) {
    const nodeManaer = require('../../manager/node');
    // 全部移除
    const uuids = parentNode.children.map((node) => node.uuid);

    uuids.forEach((uuid) => {
        const node = nodeManaer.query(uuid);

        // 重要：需要过滤隐藏节点
        if (node._objFlags & cc.Object.Flags.HideInHierarchy) {
            return;
        }

        node.parent = null;
    });

    // 重新添加
    childrenIds.forEach((uuid) => {
        const node = nodeManaer.query(uuid);
        if (node) {
            node.parent = null;
            parentNode.addChild(node);
        }
    });
}

module.exports = {
    dumpNode,
    restoreProperty,
    restoreNode,
};
