'use strict';

import { BrowserWindow , shell } from 'electron';
import { getPort, start, stop } from './express';
import { emitReload } from './socket';
const ipc = require('@base/electron-base-ipc');
const profile = Editor.Profile.load('profile://global/packages/preferences.json');

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

    //////////////////////////

    /**
     * 根据 type 类型打开对应终端预览界面
     * @param {string} type
     */
    'open-terminal'(type: string = 'browser') {
        if (type === 'browser') {
            shell.openExternal(`http://localhost:${getPort()}`);
        } else {
            // 模拟器预览
            // const win = new BrowserWindow({width: 1000, height: 700});
            // win.loadURL(`http://localhost:${getPort()}`);
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
        ipc.send('package-preview:device-num-change', deviceNum);
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

ipc.on('package-preview:get-port', (event: any) => {
    event.reply(null, getPort());
});
