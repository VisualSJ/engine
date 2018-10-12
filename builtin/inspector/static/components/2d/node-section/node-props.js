'use strict';

const { readTemplate } = require('../../../utils');

exports.template = readTemplate('2d', './node-section/node-props.html');

exports.props = [
    'node',
];

exports.data = function() {
    return {};
};

exports.mounted = async function() {};
