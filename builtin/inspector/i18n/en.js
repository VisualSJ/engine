'use strict';

module.exports = {
    title: 'inspector',
    add_component: 'Add Component',
    add_ui_component: 'Add UI Component',
    move_down: 'Move Down',
    move_up: 'Move Up',
    remove: 'Remove',
    reset: 'Reset',
    reset_node: 'Reset Node',
    reset_all: 'Reset All',
    select_button: 'Select In Atlas',
    edit_button: 'Edit',
    resize_to_target: 'Resize To Target',
    difference: 'Difference',
    javascript: {
        plugin: 'Import As Plugin',
        loadPluginInWeb: 'Load In Web',
        loadPluginInEditor: 'Load In Editor',
        loadPluginInNative: 'Load In Native'
    },
    block_input_events: {
        brief_help: `This component will block all input events,
            preventing the input from penetrating into the underlying node,
            typically for the background of the top UI.`
    },
    node: {
        title: 'Node Presets',
        create_empty: 'Create Empty Node',
        renderers: 'Create Renderer Nodes',
        ui: 'Create UI Nodes',
        sprite: 'Sprite Node',
        sprite_splash: 'Sprite Node (Splash)',
        particle: 'ParticleSystem Node',
        tiledmap: 'TiledMap Node',
        tiledtile: 'TiledTile Node',
        mask: 'Mask Node',
        label: 'Node With Label',
        scrollview: 'Node With ScrollView',
        pageview: 'Node With PageView',
        slider: 'Node With Slider',
        button: 'Node With Button',
        canvas: 'Node With Canvas',
        layout: 'Node With Layout',
        progressbar: 'Node With ProgressBar',
        editbox: 'Node With EditBox',
        videoplayer: 'Node with VideoPlayer',
        break_prefab_instance: 'Convert to Ordinary Node',
        link_prefab: 'Connect Node To Prefab',
        webview: 'Node with WebView',
        richtext: 'Node with RichText',
        toggle: 'Node with Toggle',
        toggleContainer: 'Node with ToggleContainer',
        toggleGroup: 'Node with ToggleGroup (Legacy)'
    },
    component: {
        title: 'Component',
        renderers: 'Add Renderer Component',
        ui: 'Add UI Component',
        others: 'Add Other Component',
        scripts: 'Add Custom Component',
        collider: 'Add Collider Component',
        physics: 'Add Physics Component'
    }
};
