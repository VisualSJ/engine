'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

exports.template = readFileSync(join(__dirname, '../../template', '/2d/index.html'), 'utf8');

exports.props = [
    'type', // 当前显示的类型 node | asset
    'uuid', // 选中物体的 uuid
];

exports.components = {
    'asset-section': require('./asset-section'),
    'node-section': require('./node-section'),
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
