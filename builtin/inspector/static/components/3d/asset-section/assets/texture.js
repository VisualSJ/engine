'use strict';

const { readTemplate } = require('../../../../utils');

exports.template = readTemplate('3d', './asset-section/assets/texture.html');

exports.props = ['info', 'meta'];

exports.components = {
    'sprite-frame': require('./sprite-frame'),
    'image-preview': require('../public/image-preview'),
};

exports.data = function() {
    return {};
};

exports.methods = {
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
