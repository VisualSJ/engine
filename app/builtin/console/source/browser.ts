'use strict';

import { outputFileSync } from 'fs-extra';
import { join } from 'path';

let pkg: any = null;
const logFiles = join(Editor.Project.path, 'local', 'logs', 'project.log');

// console 不需要针对项目单独设置
const defaultProfile = Editor.Profile.load('profile://default/packages/console.json');

export const messages = {
    /**
     * 打开 console 面板
     */
    open() {
        Editor.Panel.open('console');
    },

    /**
     * 刷新面板上的所有数据
     * 一般用于配置更改需要刷新的时候
     */
    'refresh-panel'() {
        if (Editor.Panel.has('console')) {
            Editor.Ipc.sendToPanel('console', 'refresh');
        }
    },
};

export function load() {
    // @ts-ignore
    pkg = this;

    // 设置默认配置
    defaultProfile.set('panel', {
        displayDate: false,
        fontSize: 12,
        lineHeight: 24,
    });

    // 清空之前的日志
    outputFileSync(logFiles, '', 'utf-8');
}

export function unload() {}
