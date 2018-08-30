'use strict';

const profile = Editor.Profile.load('profile://global/packages/preferences.json');
let pkg: any = null;

export const messages = {
    open() {
        Editor.Panel.open('preferences');
    },
};

export function load() {
    // @ts-ignore
    pkg = this;

    // 应用语言
    const language = profile.get('language') || 'en';
    Editor.I18n.switch(language);

    // 应用皮肤
    const theme = profile.get('theme') || '';
    Editor.Theme.use(theme);
}

export function unload() {}
