'use strict';
import { existsSync, outputFileSync } from 'fs-extra';
import { join } from 'path';
let pkg: any = null;
const profile = Editor.Profile.load('profile://global/packages/consol.json');
const logFiles = join(Editor.Project.path, 'local', 'logs', 'project.log');
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

    // 查询 log 日志保存路径
    'get-log-files'() {
        return logFiles;
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
    initLogInfo();
}

export function unload() { }

/**
 * 初始化/清空 log 信息存储
 */
function initLogInfo() {
    outputFileSync(logFiles, '', 'utf-8');
}
