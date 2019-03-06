'use strict';
const { readFileSync } = require('fs');
const { join } = require('path');

const resources_tips = readFileSync(join(__dirname, '../static/markdown/resources-tips-zh.md'), { encoding: 'utf-8' });

module.exports = {
    title: '属性检查器',
    add_component: '添加组件',

    menu: {
        remove_component: '删除组件',
        move_up_component: '向上移动',
        move_down_component: '向下移动',
    },

    asset: {
        directory: {
            is_subpackage: '配置为子包',
            subpackage_name: '子包名',
        },

        javascript: {
            plugin: '导入为插件',
            loadPluginInWeb: '允许 Web 平台加载',
            loadPluginInEditor: '允许编辑器加载',
            loadPluginInNative: '允许 Native 平台加载',
        },

        fbx: {
            browse: '浏览',
        },

        spriteFrame: {
            edit: '编辑',
        },
    },

    gradient: {
        title: '渐变编辑器',
    },

    curve_editor: {
        title: 'Curve 编辑器',
    },

    sprite_editor: {
        title: 'Sprite 编辑器',
        scale: 'Scale',
        reset: '重置',
        save: '保存',
        saveError: '保存数据失败',
        border: 'Border',
        left: 'Left',
        right: 'Right',
        top: 'Top',
        bottom: 'Bottom',
    },
};
