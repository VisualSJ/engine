'use strict';
const { shell } = require('electron');
const server = require('./server');
let pkg: any = null;

export const messages = {
    /**
     * 刷新浏览器预览页面
     */
    'browser-reload'() {
        server.browserReload();
    },
    /**
     * 根据 type 类型打开对应终端预览界面
     * @param {string} type
     */
    'open-terminal'(type: string) {
        if (type === 'browser') {
            shell.openExternal(`http://localhost:${server.previewPort}`);
        }
    },
    'scene:save'() {
        server.browserReload();
    }
};

export function load() {
    // @ts-ignore
    pkg = this;
    server.start();
}

export function unload() {
    server.stop();
}
