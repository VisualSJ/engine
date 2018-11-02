'use strict';

const { readTemplate, readComponent, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/editbox.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};

exports.methods = {
    T
};
