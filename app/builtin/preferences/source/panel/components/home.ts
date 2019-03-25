'use strict';

export const data = {
    tab: 'general',

    language: '',
};

export const watch = {};

export const computed = {};

export const components = {
    'general': require('./general'),
    'edit': require('./edit'),
    'extension': require('./extension'),
};

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string, language: string) {
        const name = `preferences.${key}`;
        return Editor.I18n.t(name);
    },
};

export function mounted() {};