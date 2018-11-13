'use strict';

const { readTemplate, readComponent } = require('../../utils');

exports.template = readTemplate('3d', './index.html');

exports.props = [
    'type', // 当前显示的类型 node | asset
    'uuid', // 选中物体的 uuid
];

exports.components = {
    'asset-section': readComponent(__dirname, './asset-section'),
    'node-section': readComponent(__dirname, './node-section'),
};

exports.data = function() {
    return {};
};

exports.methods = {
    refresh() {
        this.$refs.node && this.$refs.node.refresh();
    }
};

exports.mounted = function() {

};
