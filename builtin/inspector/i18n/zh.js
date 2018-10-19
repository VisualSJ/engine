'use strict';

module.exports = {
    title: '属性检查器',
    add_component: '添加组件',
    add_ui_component: '添加 UI 组件',
    move_down: 'Move Down',
    move_up: 'Move Up',
    remove: 'Remove',
    reset: 'Reset',
    reset_node: 'Reset Node',
    reset_all: 'Reset All',
    select_button: '选择',
    edit_button: '编辑',
    resize_to_target: 'Resize To Target',
    difference: 'Difference',
    javascript: {
        plugin: '导入为插件',
        loadPluginInWeb: '允许 Web 平台加载',
        loadPluginInEditor: '允许编辑器加载',
        loadPluginInNative: '允许 Native 平台加载'
    },
    block_input_events: {
        brief_help: '该组件将拦截所有输入事件，防止输入穿透到下层节点，一般用于上层 UI 的背景。'
    },

    node: {
        title: '节点',
        create_empty: '创建空节点',
        renderers: '创建渲染节点',
        ui: '创建 UI 节点',
        sprite: 'Sprite（精灵）',
        sprite_splash: 'Sprite（单色）',
        particle: 'ParticleSystem（粒子）',
        tiledmap: 'TiledMap（地图）',
        tiledtile: 'TiledTile（地图块）',
        label: 'Label（文字）',
        scrollview: 'ScrollView（滚动视图）',
        pageview: 'PageView（页面视图）',
        slider: 'Slider（滑动器）',
        button: 'Button（按钮）',
        canvas: 'Canvas（画布）',
        layout: 'Layout（布局）',
        progressbar: 'ProgressBar（进度条）',
        editbox: 'EditBox（输入框）',
        videoplayer: 'VideoPlayer（播放器）',
        break_prefab_instance: '还原成普通节点',
        link_prefab: '关联节点到预制',
        webview: 'WebView（网页视图）',
        richtext: 'RichText（富文本）',
        toggle: 'Toggle（复选按钮）',
        toggleContainer: 'ToggleContainer（单选按钮）',
        toggleGroup: 'ToggleGroup（旧版单选按钮）'
    },
    component: {
        title: '组件',
        renderers: '添加渲染组件',
        ui: '添加 UI 组件',
        others: '添加其他组件',
        scripts: '添加用户脚本组件',
        collider: '添加碰撞组件',
        physics: '物理'
    }
};
