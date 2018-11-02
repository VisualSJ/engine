'use strict';

const { readTemplate, readComponent, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/toggle.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,

    resetNodeSize() {
        // todo
    },

    checkTransition(target, value, multi) {
        if (multi) {
            // todo
        } else {
            return +target.value === value;
        }
    }
};
