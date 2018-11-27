'use strict';
const { shell } = require('electron');
const { basename, extname, join } = require('path');
const { readTemplate, T } = require('../../../../utils');
const { assetComponentPrefix } = require('../../asset-section');

exports.template = readTemplate('3d', './asset-section/assets/folder.html');

exports.props = ['meta', 'info'];

exports.data = function() {
    return {
        url: '',
        isResources: false,
    };
};
// todo
exports.components = {
    [`${assetComponentPrefix}markdown-preview`]: require('../public/markdown-preview'),
};

exports.mounted = function() {
    this.targetChanged();
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

    targetChanged() {
        if (this.info) {
            this.url = this.info.source || '';
            this.isResources = this.url === 'db://assets/resources';
        } else {
            this.url = '';
            this.isResources = false;
        }
    },

    async explore() {
        const path = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', this.info.uuid);
        shell.showItemInFolder(path);
    },

    subPackageName(url) {
        return basename(url, extname(url));
    },

    getMarkdownContent() {
        return T('assets', 'resources_tips');
    },
};

exports.watch = {
    info: 'targetChanged',
};
