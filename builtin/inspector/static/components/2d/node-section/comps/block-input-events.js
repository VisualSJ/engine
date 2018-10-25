'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/block-input-events.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T
};
