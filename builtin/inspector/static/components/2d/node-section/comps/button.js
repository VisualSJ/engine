'use strict';

const { readTemplate, readComponent, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/button.html');

exports.props = ['target'];

exports.components = {
    'array-prop': readComponent(__dirname, '../public/array-prop')
};

exports.data = function() {
    return {};
};

exports.methods = {
    T,
    resetNodeSize() {
        // todo
    },
    autoGrayEffectEnabled() {
        // todo
    },
    checkResizeToTarget(target) {
        // todo
    },
    checkTransition(transition, num) {
        return +transition.value === num;
    }
};
