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
    },

    gradient: {
        title: 'Gradient Editor',
    },

    curve_editor: {
        title: 'Curve Editor',
    },
};
