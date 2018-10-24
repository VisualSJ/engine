'use strict';

const { readTemplate } = require('../../../../utils');

exports.template = readTemplate('2d', './asset-section/assets/none.html');

exports.props = ['meta', 'info'];

exports.components = {};

exports.data = function() {
    return {
        cssHost: {
            display: 'flex',
            flex: 'none',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '3px 10px 5px',
            borderBottom: '1px solid #666',
            height: '24px',
            overflow: 'hidden'
        },
        cssIcon: { marginRight: '5px' },
        cssTitle: { fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden' }
    };
};

exports.mounted = async function() {};
