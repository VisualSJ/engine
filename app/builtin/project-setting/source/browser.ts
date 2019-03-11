'use strict';

let pkg: any = null;

const profile = {
    default: Editor.Profile.load('profile://default/packages/project-setting.json'),
    global: Editor.Profile.load('profile://global/packages/project-setting.json'),
    local: Editor.Profile.load('profile://local/packages/project-setting.json'),
};

export const messages = {

    /**
     * 打开项目
     */
    open() {
        Editor.Panel.open('project-setting');
    },

    /**
     * 查询项目设置配置
     * @param {string} key
     */
    'get-config'(key: string) {
        if (profile.local.get(`${key.split('.')[0]}.use_local`)) {
            return profile.local.get(key);
        }
        return profile.global.get(key);
    },

    /**
     * 设置项目信息配置
     * @param key
     * @param value
     * @param type
     */
    'set-config'(key: string, value: any, type: string = 'local') {
        if (type !== 'local' && type !== 'global') {
            return;
        }
        return profile[type].set(key, value);
    },
};

export function load() {
    // @ts-ignore
    pkg = this;

    profile.default.set('preview', {
        use_global: true,
        // 预览场景配置
        start_scene: 'current_scene',
        // canvas 配置
        design_height: 480,
        design_width: 600,
        fit_height: false,
        fit_width: true,
        // 模拟器配置
        simulator_device_orientation: 'vertical',
        simulator_height: 480,
        simulator_resolution: 'iphone4',
        simulator_setting_type: 'global',
        simulator_width: 960,
    });

    profile.default.set('modules', {
        use_global: true,
        excluded: [],
    });

    profile.default.set('graphics', {
        use_global: true,
        render_pipeline: 0,
    });
}

export function unload() {}
