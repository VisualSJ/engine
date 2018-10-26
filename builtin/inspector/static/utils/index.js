'use stirct';

const { readFileSync } = require('fs');
const { join } = require('path');

/**
 * 读取模版文件
 * @param {*} type 模版类型
 * @param {*} file 模版相对于目录的相对地址
 */
function readTemplate(type, file) {
    file = join(__dirname, '../template', type, file);
    // todo exists
    return readFileSync(file, 'utf8');
}

/**
 * require 一个指定的组件
 * @param  {...any} paths
 */
function readComponent(...paths) {
    const comp = require(join(...paths));
    comp.components = comp.components || {};
    comp.components['cc-color'] = require('../components/public/cc-color');
    comp.components['cc-size'] = require('../components/public/cc-size');
    comp.components['cc-vec2'] = require('../components/public/cc-vec2');
    comp.components.enum = require('../components/public/enum');
    comp.components.boolean = require('../components/public/boolean');
    comp.components.number = require('../components/public/number');
    comp.components.string = require('../components/public/string');
    comp.components['cc-dragable'] = require('../components/public/cc-dragable');
    comp.components['cc-structure'] = require('../components/public/cc-structure');
    return comp;
}

/**
 * 提供 Editor 的多语言功能
 * @param {...string[]} rest
 * @returns
 */
function T(...rest) {
    const prefix = 'inspector';
    rest.unshift(prefix);
    return Editor.I18n.t(rest.join('.'));
}

function checkIsAsset(types) {
    return types.includes('cc.Asset');
}

function checkIsNumber(type) {
    return ['Integer', 'Float'].includes(type);
}

const convertMap = {
    'cc.Node': 'cc-dragable'
};

/**
 * 获取 target 类型对应的 component 类型
 * @param {*} target
 */
function getComponentType(target, $options) {
    if (!target || !target.type) {
        return false;
    }
    let { type, extends: extendTypes = [] } = target;

    if (checkIsNumber(type)) {
        return 'number';
    }

    if (checkIsAsset([type, ...extendTypes])) {
        return 'cc-dragable';
    }

    type = convertMap[type] || type;
    type = type.toLocaleLowerCase();
    type = type.replace(/\./, '-');

    if ($options && $options.components) {
        return $options.components[type] ? type : false;
    }

    console.warn(`getComponentType should always pass $options`);
    return false;
}

module.exports = {
    readTemplate,
    readComponent,
    T,
    getComponentType
};
