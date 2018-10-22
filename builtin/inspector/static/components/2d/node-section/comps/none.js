'use strict';

const { readTemplate, readComponent } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/none.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

const convertMap = {
    'cc.Asset': 'cc-dragable',
    'cc.SpriteFrame': 'cc-dragable',
    'cc.Sprite': 'cc-dragable',
    'cc.Node': 'cc-dragable',
    Float: 'number'
};

exports.methods = {
    /**
     * 将 type 转成 component 名字
     * @param {*} type
     */
    getComponent(type) {
        if (!type) {
            return false;
        }
        type = convertMap[type] || type;
        type = type.toLocaleLowerCase();
        type = type.replace(/\./, '-');

        return this.$options.components[type] ? type : false;
    }
};

exports.mounted = async function() {};
