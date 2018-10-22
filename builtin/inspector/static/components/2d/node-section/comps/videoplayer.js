'use strict';

const { readTemplate, readComponent, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/videoplayer.html');

exports.props = ['target'];

exports.components = {
    'array-prop': readComponent(__dirname, '../public/array-prop')
};

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    isLocal() {
        return this.target.resourceType.value === 1;
    }
};
