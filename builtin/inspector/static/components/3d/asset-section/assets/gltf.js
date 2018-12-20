'use strict';
const { readFile } = require('fs');
const { readTemplate } = require('../../../../utils');
const { eventBus } = require('../../../../utils/eventBus');

exports.template = readTemplate('3d', './asset-section/assets/gltf.html');

exports.props = ['meta', 'info'];

exports.data = function() {
    return {
        cssHost: {
            display: 'flex',
            flex: 'none',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '3px 10px 5px',
            borderBottom: '1px solid #666',
            height: '24px',
            overflow: 'hidden',
        },
        cssIcon: { marginRight: '5px' },
        cssTitle: { fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden' },
        effectName: '',
        effectMap: {},
        dirty: false,
        // 当前材质
        material: null,
        allEffects: {},
        dirty: false,
    };
};

exports.mounted = function() { };

exports.beforeDestroy = function() { };

exports.computed = { };

exports.watch = { };

exports.methods = {

    /**
     * 恢复 meta 数据
     */
    async reset() { },

    /**
     * 应用 meta 数据修改
     */
    async apply() { },
};
