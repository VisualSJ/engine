'use strict';

const { readTemplate } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/pageview.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};
