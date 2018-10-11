'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

exports.template = readFileSync(join(__dirname, '../../../template', '/2d/asset-section/index.html'), 'utf8');

exports.props = [
    'uuid',
];

exports.components = {
    none: require('./assets/none'),
    texture: require('./assets/texture'),
    'sprite-frame': require('./assets/sprite-frame'),
};

exports.data = function() {
    return {
        dirty: false,

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

    async refresh() {
        this.info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', this.uuid);
        this.meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', this.uuid);
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
        this.dirty = true;

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
    },
};

exports.mounted = function() {
    this.refresh();

    this.$on('reset', () => {
        this.meta = null;
        this.info = null;
        this.refresh();
        this.dirty = false;
    });

    this.$on('apply', () => {
        const meta = JSON.parse(JSON.stringify(this.meta));
        Editor.Ipc.sendToPackage('asset-db', 'save-asset-meta', this.uuid, meta);
        this.dirty = false;
    });
};
