'use strict';

import { shell } from 'electron';
import { getPort, start, stop } from './express';
import { emitReload } from './socket';
const ipc = require('@base/electron-base-ipc');

let pkg: any = null;

export const messages = {
    /**
     * 场景保存的时候发送的消息
     */
    'scene:save'() {
        emitReload();
    },

    //////////////////////////

    /**
     * 根据 type 类型打开对应终端预览界面
     * @param {string} type
     */
    'open-terminal'(type: string) {
        if (type === 'browser') {
            shell.openExternal(`http://localhost:${getPort()}`);
        }
    },

    /**
     * 刷新浏览器预览页面
     */
    'reload-terminal'() {
        emitReload();
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
