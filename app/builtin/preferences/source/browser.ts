'use strict';

const profile = {
    default: Editor.Profile.load('profile://default/packages/preferences.json'),
    global: Editor.Profile.load('profile://global/packages/preferences.json'),
};

export const messages = {
    open() {
        Editor.Panel.open('preferences');
    },
    /**
     * 查询记录的项目设置信息
     * @param {string} key
     */
    'get-config'(key: string) {
        return profile.global.get(key);
    },

    /**
     * 设置项目设置
     * @param {string} key
     */
    'set-config'(key: string, value: any) {
        profile.global.set(key, value);
    },

    /**
     * 设置设置面板的 tab 索引
     * @param index
     */
    'update-tab'(index: number) {
        Editor.Ipc.sendToPanel('preferences', 'update-tab', index);
    },
};

export function load() {
    profile.default.set('edit', {
        script_editor_list: [],
        script_editor: '',

        picture_editor_list: [],
        picture_editor: '',
    });
}

export function unload() {}
