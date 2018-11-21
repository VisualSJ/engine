'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

import {
    apply as messageApply,
    init as messageInit,
} from './message';

window.customElements.define('engine-view', require('../../static/script/engine-view'));

let panel: any = null;
const profile = Editor.Profile.load('profile://local/packages/scene.json');

export const style = readFileSync(join(__dirname, '../../dist/index.css'));

export const template = readFileSync(join(__dirname, '../../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    content: '.content',

    scene: '.scene',

    path: 'footer .path',
    version: 'footer .version',
};

export const listeners = {
    /**
     * panel 页面大小改变触发的事件
     */
    resize() {
        // @ts-ignore
        window.app && window.app.resize();
    },
};

export const methods = {};

export const messages = messageApply();

export async function ready() {
    // @ts-ignore
    panel = this;

    // 初始化引擎管理器
    await panel.$.scene.init();

    messageInit(panel);

    // 显示版本号
    panel.$.version.innerHTML = 'Version: ' + panel.$.scene.version;

    const uuid = profile.get('current-scene');
    Editor.Ipc.sendToPackage('scene', 'open-scene', uuid);
}

/**
 * 检查关闭阶段需要检查是否场景更改了未保存
 */
export async function beforeClose() {
    const dirty = await panel.$.scene.forwarding('Scene', 'queryDirty');

    if (dirty) {
        return;
    }

    // 如果数据被修改了，弹出提示框询问是否保存
    const code = await Editor.Dialog.show({
        title: Editor.I18n.t('scene.messages.waning'),
        message: Editor.I18n.t(
            'scene.messages.scenario_modified'
        ),
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
            return true;
    }
}

/**
 * 面板关闭的时候，场景也会注销
 * 所以要发送场景关闭事件
 */
export async function close() {
    // 等待场景关闭
    await Editor.Ipc.requestToPackage('scene', 'close-scene');
}
