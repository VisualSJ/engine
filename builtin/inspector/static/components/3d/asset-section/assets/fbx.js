'use strict';
const { dirname } = require('path');
const { readTemplate, T } = require('../../../../utils');

exports.template = readTemplate('3d', './asset-section/assets/fbx.html');

exports.props = ['meta', 'info'];

exports.data = function() {
    return {
        imageLocations: {},
    };
};

exports.mounted = function() {};

exports.watch = {
    'meta.userData.imageLocations': {
        deep: true,
        immediate: true,
        handler: async function(val) {
            for (const key in val) {
                if (val.hasOwnProperty(key)) {
                    const item = await this.transform(val[key].targetDatabaseUrl);
                    this.$set(this.imageLocations, key, item);
                }
            }
        },
    },
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

    dispatch() {
        const evt = document.createEvent('HTMLEvents');
        evt.initEvent('meta-changed', true, true);
        this.$el.dispatchEvent(evt);
    },

    async transform(path) {
        if (!path) {
            return path;
        }

        if (path.includes('db://')) {
            return await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', path);
        }

        return await Editor.Ipc.requestToPackage('asset-db', 'query-url-by-path', path);
    },

    async openDirectory(key) {
        const {
            userData: { imageLocations },
            uuid,
        } = this.meta;
        const assetPath = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', uuid);
        const path = dirname(assetPath);
        const config = {
            root: path,
            filters: [{ name: 'Images', extensions: ['jpg', 'png'] }],
        };
        const [filePath] = await Editor.Dialog.openFile(config);

        if (filePath && filePath !== this.imageLocations[key]) {
            if (filePath.includes(path)) {
                const url = await this.transform(filePath);
                imageLocations[key].targetDatabaseUrl = url;
                this.dispatch();
            } else {
                console.warn('can not use external image');
            }
        }
    },
};
