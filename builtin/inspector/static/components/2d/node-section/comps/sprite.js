'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

exports.template = readFileSync(join(__dirname, '../../../../template', '/2d/node-section/comps/sprite.html'), 'utf8');

exports.props = [
    'target',
];

exports.components = {};

exports.data = function() {
    return {
        dirty: false,
    };
};

exports.methods = {};

exports.mounted = async function() {};
