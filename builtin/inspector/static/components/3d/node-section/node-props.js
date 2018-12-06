'use strict';

const { readTemplate, T } = require('../../../utils');

exports.template = readTemplate('3d', './node-section/node-props.html');

exports.props = ['node'];

exports.data = function() {
    return {};
};

exports.methods = {
    T,
};
