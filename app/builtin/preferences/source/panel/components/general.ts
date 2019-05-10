'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const uiProfile = Editor.Profile.load('profile://global/ui-kit.json');

export const template = readFileSync(join(__dirname, '../../../static/template/general.html'), 'utf8');

export const props = ['language'];

export function data() {
    return {
        settings: {
            language: Editor.I18n.language,
            node_tree: 'memory_last_state',
            step: uiProfile.get('num_input.step'),
            preci: uiProfile.get('num_input.preci'),
            theme_color: 'default',
        },
    };
};

export const watch = {};

export const computed = {};

export const components = {};

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string, language: string) {
        const name = `preferences.general.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 更改配置
     */
    _onSettingChanged(event: any, key: string) {
        const value =  event.target.value;
        // @ts-ignore
        this.settings[key] = value;
        switch (key) {
            case 'language':
                Editor.I18n.switch(value);
                break;
            case 'step':
                Editor.UI.NumInput.updateStep(value);
                uiProfile.set('num_input.step', value);
                uiProfile.save();
                break;
            case 'preci':
                Editor.UI.NumInput.updatePreci(value);
                uiProfile.set('num_input.preci', value);
                uiProfile.save();
                break;
            case 'theme_color':
                Editor.Theme.useColor(value);
                break;
        }
    },
};

export function mounted() {};