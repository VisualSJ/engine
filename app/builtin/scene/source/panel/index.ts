'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

import { apply as messageApply, init as messageInit } from './message';
window.customElements.define('engine-view', require('../../static/script/engine-view'));

let panel: any = null;

export const style = readFileSync(join(__dirname, '../../dist/index.css'));

export const template = readFileSync(join(__dirname, '../../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    content: '.content',

    scene: '.scene',

    version: 'footer .version',
};

/**
 * 配置 scene 的 iconfont 图标
 */
export const fonts = [{
    name: 'scene',
    file: 'packages://scene/static/iconfont.woff',
}];

export const listeners = {
    /**
     * panel 页面大小改变触发的事件
     */
    resize() {
        // @ts-ignore
        window.app && window.app.resize();
    },
};

export const messages = messageApply();

export async function ready() {
    // @ts-ignore
    panel = this;

    messageInit(panel);

    // 初始化引擎管理器
    await panel.$.scene.init();
}

/**
 * 检查关闭阶段需要检查是否场景更改了未保存
 */
export async function beforeClose() {
    return await panel.$.scene.forceForwarding('Scene', '_clearMode');
}

/**
 * 面板关闭的时候，场景也会注销
 * 所以要发送场景关闭事件
 */
export async function close() {
    // 等待场景关闭
    // await Editor.Ipc.requestToPackage('scene', 'close-scene');
}
