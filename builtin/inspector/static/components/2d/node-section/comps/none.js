'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

exports.template = readFileSync(join(__dirname, '../../../../template', '/2d/node-section/comps/none.html'), 'utf8');

exports.props = [];

exports.components = {};

exports.data = function() {
    return {};
};

exports.mounted = async function() {};
