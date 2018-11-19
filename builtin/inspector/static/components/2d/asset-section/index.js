'use strict';

const { join, basename, extname, } = require('path');
const { readTemplate, readComponent, T, } = require('../../../utils');

exports.template = readTemplate('2d', './asset-section/index.html');

exports.props = ['uuid', ];

exports.components = {
    none: require('./assets/none'),
    texture: readComponent(__dirname, './assets/texture'),
    'sprite-frame': readComponent(__dirname, './assets/sprite-frame'),
    javascript: readComponent(__dirname, './assets/javascript'),
};

exports.data = function() {
    return {
        dataReady: false,
        info: null,
        meta: null,
    };
};

exports.watch = {
    uuid() {
        this.refresh();
    },
};

exports.methods = {
    T,

    async refresh() {
        try {
            this.$root.showLoading(200);
            this.dataReady = false;
            const [info, meta, ] = await Promise.all([
                Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', this.uuid),
                Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', this.uuid),
            ]);

            if (info && meta) {
                this.info = info;
                this.meta = buildMeta(meta, info);
            } else {
                this.info = null;
                this.meta = null;
            }
        } catch (err) {
            console.error(err);
            this.info = null;
            this.meta = null;
        } finally {
            this.$root.hideLoading();
            this.dataReady = true;
        }
    },

    /**
     * 将 type 转成 component 名字
     * @param {*} type
     */
    getAsset(type) {
        type = type.toLocaleLowerCase();
        if (!exports.components[type]) {
            return 'none';
        }
        return type;
    },

    /**
     * 修改数据
     * @param {*} event
     */
    onMetaChanged(event) {
        this.meta.__dirty__ = true;
    },
};

exports.mounted = async function() {
    this.refresh();

    this.$on('reset', () => {
        this.meta = null;
        this.info = null;
        this.refresh();
        // this.dirty = false;
    });

    this.$on('apply', () => {
        const keys = Object.keys(this.meta);
        const filterMeta = keys
            .filter((key) => !key.startsWith('__'))
            .reduce((prev, next) => {
                prev[next] = this.meta[next];
                return prev;
            }, {});
        const meta = JSON.stringify(filterMeta);
        Editor.Ipc.sendToPackage('asset-db', 'save-asset-meta', this.uuid, meta);
        // this.dirty = false;
    });
};

function buildMeta(meta, info) {
    const { source = '', files = [], } = info;
    meta.__dirty__ = false;
    meta.__name__ = source && basename(source, extname(source));
    meta.__assetType__ = meta.importer;
    // todo
    // if (meta.subMetas) {
    //     const arr = [];
    //     const { subMetas } = meta;
    //     const keys = Object.keys(subMetas);
    //     for (const key of keys) {
    //         const value = subMetas[key];
    //         value.__name__ = key;
    //         arr.push(value);
    //     }
    //     meta.subMetas = arr;
    // }
    return meta;
}
