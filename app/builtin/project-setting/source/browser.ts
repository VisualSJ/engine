'use strict';

let pkg: any = null;
const profile = Editor.Profile.load('profile://global/packages/project-setting.json');
export const messages = {
    open() {
        Editor.Panel.open('project-setting');
    },
    /**
     * 查询记录的项目设置信息
     * @param {string} key
     */
    'get-setting'(key: string) {
        return profile.get(key);
    },

    /**
     * 设置项目设置
     * @param {string} key
     */
    'set-setting'(key: string, value: any) {
        profile.set(key, value);
    },

    // 保存设置信息
    'save-setting'() {
        profile.save();
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {}
