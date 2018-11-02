'use strict';

const { readTemplate, readComponent } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/pageview.html');

exports.props = ['target'];

exports.data = function() {
    return {};
};
