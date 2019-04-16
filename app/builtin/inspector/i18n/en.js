'use strict';
const { readFileSync } = require('fs');
const { join } = require('path');

const resources_tips = readFileSync(join(__dirname, '../static/markdown/resources-tips-en.md'), { encoding: 'utf-8' });

module.exports = {
    title: 'inspector',
    add_component: 'Add Component',

    menu: {
        remove_component: 'Remove',
        move_up_component: 'Move up',
        move_down_component: 'Move down',
    },

    asset: {
        directory: {
            is_subpackage: 'Subpackage',
            subpackage_name: 'Subpackage Name',
        },

        javascript: {
            plugin: 'Import As Plugin',
            loadPluginInWeb: 'Load In Web',
            loadPluginInEditor: 'Load In Editor',
            loadPluginInNative: 'Load In Native',
        },

        fbx: {
            browse: 'browse',
        },

        spriteFrame: {
            edit: 'Edit',
        },
    },

    gradient: {
        title: 'Gradient Editor',
    },

    curve_editor: {
        title: 'Curve Editor',
    },

    sprite_editor: {
        title: 'Sprite Editor',
        scale: 'Scale',
        reset: 'Reset',
        save: 'Save',
        saveError: 'Failed to save.',
        border: 'Border',
        left: 'Left',
        right: 'Right',
        top: 'Top',
        bottom: 'Bottom',
    },

    check_is_saved: {
        message: 'The modified data has not been saved. Do you want to save it?',
        save: 'Save',
        abort: 'Abort',
    },

    prefab: {
        local: 'Local',
        reset: 'Reset from asset',
        save: 'Save to asset',
    },
};
