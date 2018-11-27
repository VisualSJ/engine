'use strict';

const { readTemplate } = require('../../../../utils');
const { assetComponentPrefix } = require('../../asset-section');

exports.template = readTemplate('3d', './asset-section/assets/sprite-frame.html');

exports.props = ['info', 'meta', 'child'];

exports.components = {
    [`${assetComponentPrefix}image-preview`]: require('../public/image-preview'),
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
    },
};
