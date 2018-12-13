'use strict';

import { shell } from 'electron';
import { getPort, setPreviewBuildPath, start, stop } from './express';
import { emitReload } from './socket';
const profile = Editor.Profile.load('profile://global/packages/preferences.json');
const { DEVICES } = require('./../static/utils/util.js');
const simulator = require('./../static/simulator/simulator.js');
let previewPlatform = 'browser';
let pkg: any = null;

/**
 * 获取预览的配置信息
 * @param {string} name
 * @returns
 */
function getConfig(name: string) {
    return profile.get(`preview.${name}`);
}

export const messages = {
    /**
     * 场景保存的时候发送的消息
     */
    'scene:save'() {
        if (getConfig('autoRefresh')) {
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

    //////////////////////////

    /**
     * 根据 previewPlatform 类型打开对应终端预览界面
     */
    'open-terminal'() {
        if (previewPlatform === 'browser') {
            shell.openExternal(`http://localhost:${getPort()}`);
        } else {
            // 模拟器预览
            simulator.run();
        }
    },

    /**
     * 刷新浏览器预览页面
     */
    'reload-terminal'() {
        emitReload();
    },

    /**
     * 刷新浏览器预览页面
     */
    'device-change'(deviceNum: number) {
        Editor.Ipc.sendToAll('preview:device-num-change', deviceNum);
    },

    /**
     * 获取支持的设备信息
     */
    'get-device'() {
        return DEVICES;
    },

    'get-port'() {
        const port = getPort();
        return port;
    },

    'change-platform'(platform: string) {
        previewPlatform = platform;
    },
};

export async function load() {
    // @ts-ignore
    pkg = this;
    await start();
}

export function unload() {
    stop();
}
