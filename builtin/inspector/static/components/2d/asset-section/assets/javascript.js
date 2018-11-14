'use strict';
const { join } = require('path');
const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate(
    '2d',
    './asset-section/assets/javascript.html'
);

exports.props = ['meta', 'info'];

exports.data = function() {
    return {};
};

exports.components = {
    'code-preview': require('../public/code-preview')
};

exports.methods = {
    T,

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

exports.computed = {
    path() {
        if (this.meta) {
            return join(
                Editor.Project.path,
                'library',
                this.meta.uuid.substr(0, 2),
                `${this.meta.uuid}.js`
            );
        }
        return '';
    }
};
