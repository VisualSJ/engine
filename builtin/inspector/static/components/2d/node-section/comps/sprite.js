'use strict';

const { readTemplate } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/sprite.html');

exports.props = [
    'target',
];

exports.components = {
    'cc-vec2': require('../../../public/cc-vec2'),
};

exports.data = function() {
    return {
        dirty: false,
    };
};

exports.methods = {};

exports.mounted = async function() {};
