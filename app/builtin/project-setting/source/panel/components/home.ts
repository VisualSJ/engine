'use strict';

export const data = {
    tab: 'preview',
    position: 'global',
};

export const watch = {};

export const computed = {};

export const components = {
    'preview': require('./preview'),
    'modules': require('./modules'),
    'graphics': require('./graphics'),
};

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string) {
        const name = `project-setting.${key}`;
        return Editor.I18n.t(name);
    },
};

export function mounted() {};