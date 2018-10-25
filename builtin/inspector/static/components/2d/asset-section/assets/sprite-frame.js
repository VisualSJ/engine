'use strict';

const { readTemplate } = require('../../../../utils');

exports.template = readTemplate('2d', './asset-section/assets/sprite-frame.html');

exports.props = ['info', 'meta', 'child'];

exports.components = {
    'image-preview': require('../public/image-preview')
};

exports.data = function() {
    return {};
};

exports.methods = {
    isCustom() {
        return this.meta.userData.trimType === 'custom';
    },

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
    }
};
