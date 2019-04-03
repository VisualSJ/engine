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

    path: 'footer .path',
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
    let dirty;

    try {
        dirty = await panel.$.scene.forceForwarding('Scene', 'queryDirty');
    } catch (error) {
        dirty = false;
    }

    if (!dirty) {
        return;
    }

    // 如果数据被修改了，弹出提示框询问是否保存
    const code = await Editor.Dialog.show({
        title: Editor.I18n.t('scene.messages.waning'),
        message: Editor.I18n.t('scene.messages.scenario_modified'),
        detail: Editor.I18n.t('scene.messages.want_to_save'),
        type: 'warning',

        default: 0,
        cancel: 2,

        buttons: [
            Editor.I18n.t('scene.messages.save'),
            Editor.I18n.t('scene.messages.dont_save'),
            Editor.I18n.t('scene.messages.cancel'),
        ],
    });

    switch (code) {
        case 2:
            return false;
        case 0:
            // 等待场景保存完毕
            await Editor.Ipc.requestToPackage('scene', 'save-scene');

            // 重新发起一次保存请求，因为有可能是在动画或者 prefab 状态，需要再次检查
            await beforeClose();
            return true;
    }
}

/**
 * 面板关闭的时候，场景也会注销
 * 所以要发送场景关闭事件
 */
export async function close() {
    // 等待场景关闭
    // await Editor.Ipc.requestToPackage('scene', 'close-scene');
}
