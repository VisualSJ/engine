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
    comp.components.number = require('../components/public/number');
    return comp;
}

module.exports = {
    readTemplate,
    readComponent,
};
