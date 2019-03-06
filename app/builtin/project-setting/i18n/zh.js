'use strict';

module.exports = {
    title: '项目设置',
    nav: {
        preview: '项目预览',
        groupList: '分组管理',
        modules: '模块设置',
    },
    preview: {
        start_scene: '初始预览场景',
        current_scene: '当前打开场景',
        design_resolution: '设计分辨率',
        width: '宽度',
        height: '高度',
        fit_width: '适配屏幕宽度',
        fit_height: '适配屏幕高度',
        simulator_setting_type: '模拟器设置类型',
        global: '全局',
        project: '项目',
        section_canvas: '默认 Canvas 设置',
        simulator_device_orientation: '模拟器横竖屏设置',
        simulator_resolution: '模拟器分辨率设置',
        customize_resolution: '模拟器自定义分辨率设置',
        vertical: '竖屏',
        horizontal: '横屏',
    },
    modules: {
        title: '模块设置',
        info: '未勾选的模块在 "构建发布" 的时候不会打包进入引擎文件',
        warn: '请不要将正在使用的功能模块去除，否则构建后的工程可能无法正常工作',
        module: '模块',
        inquiry: '是否打包',
    },
};
