'use strict';

const { join, basename, extname } = require('path');
const { readTemplate, readComponent, T } = require('../../../utils');

const prefix = 'cc-';

exports.assetComponentPrefix = prefix;

exports.template = readTemplate('3d', './asset-section/index.html');

exports.props = ['uuid'];

exports.components = {
    [`${prefix}none`]: require('./assets/none'),
    [`${prefix}texture`]: readComponent(__dirname, './assets/texture'),
    [`${prefix}sprite-frame`]: readComponent(__dirname, './assets/sprite-frame'),
    [`${prefix}material`]: readComponent(__dirname, './assets/material'),
    // [`${prefix}gltf`]: readComponent(__dirname, './assets/gltf'),
    [`${prefix}javascript`]: readComponent(__dirname, './assets/javascript'),
    [`${prefix}folder`]: readComponent(__dirname, './assets/folder'),
    [`${prefix}image`]: readComponent(__dirname, './assets/image'),
    [`${prefix}effect`]: readComponent(__dirname, './assets/effect'),
    [`${prefix}fbx`]: readComponent(__dirname, './assets/fbx'),
};

exports.data = function() {
    return {
        // dataReady: false,
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

    async refresh(isSaved = false) {
        try {
            !isSaved && this.$root.showLoading(200);
            // this.dataReady = false;
            const [info, meta] = await Promise.all([
                Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', this.uuid),
                Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', this.uuid),
            ]);

            if (info && meta) {
                // console.log(info, meta);
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
            !isSaved && this.$root.hideLoading();
            // this.dataReady = true;
        }
    },

    /**
     * 将 type 转成 component 名字
     * @param {*} type
     */
    getAsset(type) {
        type = type.toLocaleLowerCase();
        if (!exports.components[`${prefix}${type}`]) {
            type = 'none';
        }
        return `${prefix}${type}`;
    },

    /**
     * 修改数据
     * @param {*} event
     */
    onMetaChange(event) {
        try {
            const { detail: { value, path } = {} } = event;
            if (path !== undefined && value !== undefined) {
                const paths = path.split('.');
                const key = paths.pop();
                const item = paths.reduce((acc, cur) => {
                    if (acc && acc[cur] !== undefined) {
                        return acc[cur];
                    }
                    return null;
                }, this.meta);

                if (item) {
                    this.$set(item, key, value);
                    this.meta.__dirty__ = true;
                }
            }
        } catch (err) {
            console.log(err);
        }
    },
};

exports.mounted = async function() {
    this.refresh();

    this.$on('reset', () => {
        // this.meta = null;
        // this.info = null;
        this.refresh();
        // this.dirty = false;
    });

    this.$on('apply', async () => {
        try {
            this.$root.showLoading();
            const keys = Object.keys(this.meta);
            const filterMeta = keys
                .filter((key) => !key.startsWith('__'))
                .reduce((prev, next) => {
                    prev[next] = this.meta[next];
                    return prev;
                }, {});
            const meta = JSON.stringify(filterMeta);
            const isSaved = await Editor.Ipc.requestToPackage('asset-db', 'save-asset-meta', this.uuid, meta);
            if (isSaved) {
                this.refresh(true);
            }
            // this.dirty = false;
        } catch (err) {
            console.error(err);
        } finally {
            this.$root.hideLoading();
        }
    });
};

function buildMeta(meta, info) {
    const { source = '', files = [] } = info;
    meta.__dirty__ = false;
    meta.__name__ = getAssetName(info);
    meta.__assetType__ = getAssetType(info);
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

function getAssetName(info) {
    const { source = '', uuid } = info;
    if (source) {
        return basename(source, extname(source));
    }
    if (uuid) {
        if (uuid.includes('@')) {
            const arr = uuid.split('@');
            return arr[arr.length - 1] || 'unknown';
        }
    }
    return 'unknown';
}

function getAssetType(info) {
    if (info.importer === '*') {
        if (info.isDirectory) {
            return 'folder';
        }
    }
    if (['texture', 'texture-cube', 'gltf-embeded-image'].includes(info.importer)) {
        return 'texture';
    }
    if (['gltf', 'fbx'].includes(info.importer)) {
        return 'fbx';
    }
    return info.importer;
}
