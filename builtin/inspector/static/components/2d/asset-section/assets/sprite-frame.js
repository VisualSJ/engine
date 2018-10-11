'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

exports.template = readFileSync(
    join(__dirname, '../../../../template', '/2d/asset-section/assets/sprite-frame.html'),
    'utf8',
);

exports.props = [
    'info',
    'meta',
    'dirty',
    'child',
];

exports.components = {};

exports.data = function() {
    return {

        cssHost: {
            display: 'flex',
            flex: 'none',
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: '2px',
            borderBottom: '1px solid #666',
            height: '24px',
            overflow: 'hidden'
        },
        cssIcon: {
            marginRight: '5px'
        },
        cssTitle: {
            fontWeight: 'bold',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
        },
    };
};

exports.methods = {
    isCustom() { return false; },

    /**
     * 重置
     */
    reset() {
        this.$parent.$emit('reset');
    },

    /**
     * 应用
     */
    apply() {
        this.$parent.$emit('apply');
    },
};

exports.mounted = async function() {};
