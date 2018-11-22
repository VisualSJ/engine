'use strict';
const { join } = require('path');
const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate(
    '3d',
    './asset-section/assets/javascript.html'
);

exports.props = ['meta', 'info'];

exports.data = function() {
    return {
        path: '',
    };
};

exports.components = {
    'code-preview': require('../public/code-preview'),
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
    },

    async getPath() {
        try {
            const {uuid} = this.meta || {};
            const path = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', uuid);
            this.path = path;
        } catch (err) {
            console.error(err);
            this.path = '';
        }
    },
};

exports.watch = {
    meta: {
        immediate: true,
        handler: function() {
            this.getPath();
        },
    },
};
