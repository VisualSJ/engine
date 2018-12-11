'use strict';

let pkg: any = null;
const profile = Editor.Profile.load('profile://global/packages/consol.json');

export const messages = {
    open() {
        Editor.Panel.open('console');
    },

    /**
     * 查询记录的 consol 设置信息
     * @param {string} key
     */
    'get-setting'(key: string) {
        return profile.get(key);
    },

    /**
     * 设置 consol
     * @param {string} key
     */
    'set-setting'(key: string, value: any) {
        profile.set(key, value);
    },

    // 保存 console 设置
    'save-setting'() {
        profile.save();
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() { }
