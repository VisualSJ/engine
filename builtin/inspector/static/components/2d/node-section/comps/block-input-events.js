'use strict';

const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('2d', './node-section/comps/block-input-events.html');

exports.props = ['target'];

exports.data = function() {
    return {
        cssBlock: {
            backgroundColor: '#333',
            border: '1px solid #666',
            borderRadius: '3px',
            margin: '10px',
            padding: '10px'
        }
    };
};

exports.methods = {
    T
};
