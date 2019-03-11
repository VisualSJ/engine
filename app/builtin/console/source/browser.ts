'use strict';
import { outputFileSync } from 'fs-extra';
import { join } from 'path';

let pkg: any = null;
const logFiles = join(Editor.Project.path, 'local', 'logs', 'project.log');

const profile = {
    global: Editor.Profile.load('profile://global/packages/consol.json'),
};

export const messages = {
    /**
     * 打开 console 面板
     */
    open() {
        Editor.Panel.open('console');
    },

    /**
     * 查询 console 的配置
     * @param key 
     */
    'get-config'(position: string, key: string) {
        if (position !== 'global') {
            return;
        }
        return profile.global.get(key);
    },

    /**
     * 设置 console 的配置
     * @param position 
     * @param key 
     * @param value 
     */
    'set-config'(position: string, key: string, value: any) {
        if (position !== 'global') {
            return;
        }
        profile.global.set(key, value);
        profile.global.save();
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
