'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const profile = {
    global: Editor.Profile.load('profile://global/packages/project-setting.json'),
    local: Editor.Profile.load('profile://local/packages/project-setting.json'),
};

export const template = readFileSync(join(__dirname, '../../../static/template/components/graphics.html'), 'utf8');

export const props = [
    'position',
];

export function data() {
    return {
        settings: {
            use_global: true,
            render_pipeline: 0, // 0:HDR 1:LDR
        },
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
     * 刷新组件
     */
    async refresh() {
        // @ts-ignore
        Object.keys(this.settings).forEach((key) => {
            // @ts-ignore
            this.settings[key] = profile[this.position].get(`graphics.${key}`);
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
        profile[this.position].set(`graphics`, this.settings);
        data.save();
    },
};

export function mounted() {
    // @ts-ignore
    this.refresh();
};