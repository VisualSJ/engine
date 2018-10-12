'use strict';

const dumpBackup = require('./dump-backup');
const { query } = require('../manager/scene');
const { get } = require('lodash');

function dumpComponent() {
    // debugger;
}

function dumpProperty() {
    // debugger;
}

/**
 * 将 type 内的数据填充到实际的 dump 内
 * @param {*} types
 * @param {*} type
 * @param {*} dump
 */
function _fillerType(types, type, dump) {
    const classType = types[type];

    Object.keys(dump).forEach((prop) => {
        const property = dump[prop];

        // 如果 cc.Node 内的 properties 有数据，则全部放到一起
        if (classType.properties[prop]) {
            const list = classType.properties[prop];
            Object.keys(list).forEach((key) => {
                property[key] = list[key];
            });
        }

        if (types[property.type]) {
            const propertyType = types[property.type];
            Object.keys(propertyType).forEach((key) => {
                if (key in property) {
                    return;
                }

                property[key] = propertyType[key];
            });
        }
    });

    Object.keys(classType.properties).forEach((property) => {
        const prop = classType.properties[property];

        if (!prop || !dump[property]) {
            return;
        }

        Object.keys(prop).forEach((key) => {
            dump[property][key] = prop[key];
        });
    });
}

/**
 * 生成一个 node 的 dump 数据
 * @param {*} node
 */
function dumpNode(node) {
    if (!node) {
        return null;
    }

    const types = {};
    const dump = dumpBackup.dumpNode(types, node);

    _fillerType(types, dump.__type__, dump);

    dump.__comps__.forEach((component) => {
        _fillerType(types, component.type, component.value);
    });

    return dump;
}

function restoreComponent() {
    // debugger;
}

/**
 * 恢复一个 dump 数据到 property
 * @param dump
 * @param property
 */
function restoreProperty(node, path, dump) {

    // dump 的时候将 _components 转成了 __comps__
    path = path.replace('__comps__', '_components');

    // path 如果是是 position.x || position.y 实际修改的应该是 node.x || node.y
    path = path.replace(/^position(\.)?/, '');
    // 如果修改的是 scale.x || scale.y 实际修改的应该是 node.scaleX || node.scaleY
    path = path === 'scale.x' ? 'scaleX' : path;
    path = path === 'scale.y' ? 'scaleY' : path;
    // 如果修改的是 anchor.x || anchor.y 实际修改的应该是 node.anchorX || node.anchorY
    path = path === 'anchor.x' ? 'anchorX' : path;
    path = path === 'anchor.y' ? 'anchorY' : path;
    // 如果修改的是 size.width || size.height 实际修改的应该是 node.width || node.height
    path = path.replace(/^size\./, '');
    // 如果修改的是 skew.x || skew.y 实际修改的应该是 node.skewX || node.skewY
    path = path === 'skew.x' ? 'skewX' : path;
    path = path === 'skew.y' ? 'skewY' : path;

    const keys = (path || '').split('.');
    const key = keys.pop();
    const spath = keys.join('.');

    const property = spath ? get(node, spath) : node;

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
            const { a: opacity, r, g, b } = dump.value;
            property[key] = new cc.Color(r, g, b, 255);
            property.opacity = Math.floor(opacity * 255);
            break;
        case 'cc.Asset':
            cc.AssetLibrary.loadAsset(dump.value.uuid || '', (err, asset) => {
                property[key] = asset;
            });
            break;
        case 'enums':
            dump.value -= 0;
        default:
            property[key] = dump.value;
    }
}

function restoreNode() {
    // debugger;
}

module.exports = {
    dumpComponent,
    dumpProperty,
    dumpNode,
    restoreComponent,
    restoreProperty,
    restoreNode
};
