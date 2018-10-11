'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

exports.template = readFileSync(join(__dirname, '../../../template', '/2d/node-section/node-props.html'), 'utf8');

exports.props = [
    'node',
];

exports.components = {

};

exports.data = function() {
    return {};
};

exports.mounted = async function() {};
