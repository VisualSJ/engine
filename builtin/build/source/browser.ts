'use strict';

let pkg: any = null;
const { buildSetting, getModules, getCurrentScene} = require('./../static/scripts/utils.js');
const profile = Editor.Profile.load('profile://global/packages/builder.json');
const address = require('address');
/**
 * 打开 build 面板
 */
export const messages = {
    open() {
        Editor.Panel.open('build');
    },

    /********************** 查询构建设置信息 *******************/
    /**
     * 查询记录的构建设置信息
     * @param {string} key
     */
    'get-builder'(key: string) {
        return profile.get(key);
    },

    /**
     * 设置构建项目设置
     * @param {string} key
     */
    'set-builder'(key: string, value: any) {
        profile.set(key, value);
    },

    // 保存构建设置信息
    'save-builder'() {
        profile.save();
    },

// ******************** 获取构建相关脚本的处理方法 ********************/
    /**
     * 构建 setting 脚本
     * @param {object} options
     */
    async 'build-setting'(options: object, config: object) {
        const setting = await buildSetting(options, config);
        return setting;
    },

    /**
     * 将脚本处理为 web 端可用的格式
     * @param {string} path
     */
    async 'get-modules'(path: string) {
        const str = await getModules(path);
        return str;
    },

    /**
     * 获取当前场景信息，若有传入 uuid 则查询该 uuid 的场景 asset 数据
     * @param {string} uuid
     * @returns {object} asset
     */
    async 'get-current-scene'(uuid: string) {
        return await getCurrentScene(uuid);
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {

}
