'use strict';

import { ipcMain, shell } from 'electron';
import { getPort, setPreviewBuildPath, start, stop } from './express';
import { emitReload } from './socket';

const { configProfile, getConfig} = require('./util');
const { DEVICES } = require('./../../static/utils/config.js');
// const simulator = require('./../../static/simulator/simulator.js');
let previewPlatform = 'browser';
let pkg: any = null;

export const messages = {
    open() {
        Editor.Panel.open('preview');
    },

    /**
     * 场景保存的时候发送的消息
     */
    'scene-save'() {
        if (getConfig('auto_refresh')) {
            emitReload();
        }
    },

    /**
     * 设置构建的静态资源路径
     * @param {string} path 路径
     */
    'set-build-path'(path: string) {
        setPreviewBuildPath(path);
    },

    /**
     * 设置预览偏好设置
     * @param key
     * @param value
     * @param type [global | project]
     */
    'set-preference'(key: string, value: any, type: string) {
        configProfile[type].set(key, value);
    },

    /**
     * 查询设置信息(默认查询偏好设置里的内容)
     * @param key
     * @param type
     */
    'get-prefrence'(key: string, type: string = 'previewConfig') {
        return getConfig(key, type);
    },
    //////////////////////////

    /**
     * 根据 previewPlatform 类型打开对应终端预览界面
     */
    'open-terminal'() {
        if (previewPlatform === 'browser') {
            shell.openExternal(`http://localhost:${getPort()}`);
        } else {
            // 模拟器预览
            // simulator.run();
        }
    },

    /**
     * 刷新浏览器预览页面
     */
    'reload-terminal'() {
        emitReload();
    },

    /**
     * 获取预览支持的设备信息
     */
    'get-device'() {
        return DEVICES;
    },

    /**
     * 获取当前端口号
     */
    'get-port'() {
        const port = getPort();
        return port;
    },

    /**
     * 获取当前预览平台
     */
    'get-platform'() {
        return previewPlatform;
    },

    /**
     * 更改当前预览平台
     * @param platform
     */
    'change-platform'(platform: string) {
        previewPlatform = platform;
    },
};

const func = (event: any) => {
    event.sender.send('query-current-content-id:reply', event.sender.id);
};

export async function load() {
    // @ts-ignore
    pkg = this;
    await start();

    ipcMain.on('query-current-content-id', func);
}

export function unload() {
    stop();

    ipcMain.removeListener('query-current-content-id', func);
}
