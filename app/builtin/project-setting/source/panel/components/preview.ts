'use strict';

import { readFileSync } from 'fs';
import { join, basename } from 'path';

const profile = {
    global: Editor.Profile.load('profile://global/packages/project-setting.json'),
    local: Editor.Profile.load('profile://local/packages/project-setting.json'),
};

export const template = readFileSync(join(__dirname, '../../../static/template/components/preview.html'), 'utf8');

export const props = [
    'position',
];

export function data() {
    return {
        settings: {
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
        },
        scenes: [],
        devices: [],
    };
};

export const watch = {
    position() {
        // @ts-ignore
        this.refresh();
    }
};

export const computed = {};

export const components = {};

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string) {
        const name = `project-setting.preview.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 刷新组件
     */
    async refresh() {
        // @ts-ignore
        if (this.scenes.length === 0) {
            const scenes = await Editor.Ipc.requestToPackage('asset-db', 'query-assets', {type: 'scene'});
            if (scenes) {
                // @ts-ignore
                this.scenes = scenes.map((item) => {
                    return {
                        uuid: item.uuid,
                        name: basename(item.source),
                    };
                });
            }
        }

        // @ts-ignore
        if (this.devices.length === 0) {
            // @ts-ignore
            this.devices = await Editor.Ipc.requestToPackage('preview', 'get-device');
        }

        // @ts-ignore
        Object.keys(this.settings).forEach((key) => {
            // @ts-ignore
            this.settings[key] = profile[this.position].get(`preview.${key}`);
        });
    },

    /**
     * 将数据重新设置到 profile，并保存
     * @param event 
     * @param key 
     */
    _onSettingsChanged(event: any, key: string) {
        // @ts-ignore
        const data = profile[this.position];
        // @ts-ignore
        this.settings[key] = event.target.value;

        // 全部重新设置一遍是为了第一次生成整份的数据
        // @ts-ignore
        profile[this.position].set(`preview`, this.settings);
        data.save();
    },
};

export function mounted() {
    // @ts-ignore
    this.refresh();
};