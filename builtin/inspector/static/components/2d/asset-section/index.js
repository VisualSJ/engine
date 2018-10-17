'use strict';

const { join, basename, extname } = require('path');
const { readTemplate } = require('../../../utils');

exports.template = readTemplate('2d', './asset-section/index.html');

exports.props = ['uuid'];

exports.components = {
    none: require('./assets/none'),
    texture: require('./assets/texture'),
    'sprite-frame': require('./assets/sprite-frame'),
    javascript: require('./assets/javascript')
};

exports.data = function() {
    return {
        dataReady: false,
        info: null,
        meta: null
    };
};

exports.watch = {
    uuid() {
        this.refresh();
    }
};

exports.methods = {
    async refresh() {
        this.$root.toggleLoading(true);
        this.dataReady = false;

        const [info, meta] = await Promise.all([
            Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', this.uuid),
            Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', this.uuid)
        ]);

        if (info && meta) {
            this.info = info;
            this.meta = buildMeta(meta, info);
        }

        this.$root.toggleLoading(false);
        this.dataReady = true;
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

        // 获取属性的搜索路径
        let path = '';
        event.path.forEach((item) => {
            if (item.path) {
                path = path ? `${item.path}.${path}` : item.path;
            }
        });

        path = path.replace('.meta.', '.');

        const paths = path.split('.');
        const key = paths.pop();

        let data = this;
        while (paths.length) {
            data = data[paths.shift()];
        }

        data[key] = event.target.value;
    }
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
        const meta = JSON.parse(JSON.stringify(this.meta));
        Editor.Ipc.sendToPackage('asset-db', 'save-asset-meta', this.uuid, meta);
        // this.dirty = false;
    });
};

function buildMeta(meta, info) {
    const { source = '', files = [] } = info;
    meta.__dirty__ = false;
    meta.__name__ = source && basename(source, extname(source));
    meta.__src__ = files[0];
    meta.__assetType__ = meta.importer;
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
