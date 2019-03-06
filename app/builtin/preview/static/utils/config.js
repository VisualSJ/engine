const DEVICES = {
    default: { name: 'default', height: 960, width: 640},
    ipad: { name: 'Apple iPad', width: 1024, height: 768, ratio: 2 },
    ipad_mini: { name: 'Apple iPad Mini', width: 1024, height: 768, ratio: 1 },
    iPhone4: { name: 'Apple iPhone 4', width: 320, height: 480, ratio: 2 },
    iPhone5: { name: 'Apple iPhone 5', width: 320, height: 568, ratio: 2 },
    iPhone6: { name: 'Apple iPhone 6', width: 375, height: 667, ratio: 2 },
    iPhone6_plus: { name: 'Apple iPhone 6 Plus', width: 414, height: 736, ratio: 3 },
    huawei9: { name: 'Huawei P9', width: 540, height: 960, ratio: 2},
    huawei_mate9_pro: { name: 'Huawei Mate9 Pro', width: 720, height: 1280, ratio: 2},
    nexu4: { name: 'Goolge Nexus 4', width: 384, height: 640, ratio: 2 },
    nexu5: { name: 'Goolge Nexus 5', width: 360, height: 640, ratio: 3 },
    nexu6: { name: 'Goolge Nexus 6', width: 412, height: 732, ratio: 3.5 },
    nexu7: { name: 'Goolge Nexus 7', width: 960, height: 600, ratio: 2 },
};

const DEFAULT_CONFIG = {
    // TODO:注册到 windows 工具栏上的配置
    // windowToobarConfig : {

    // },
    // 预览页面的菜单项配置默认值
    toolbarConfig : {
        device: 'default',
        rotate: false,
        debugMode: 0,
        showFps: false,
        fps: 60,
    },
    previewConfig : {
        start_scene: 'current_scene',
        auto_refresh: true,
        preview_browser: 'default',
        design_width: 960,
        design_height:  480,
        fit_width: true,
        fit_height: false,
    },
};

module.exports = {
    DEVICES,
    DEFAULT_CONFIG,
};
