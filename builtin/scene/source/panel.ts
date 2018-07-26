'use strict';

import { join } from 'path';
import { readFileSync } from 'fs';

const Vue = require('vue/dist/vue.js');

let panel: any = null;

let loadScene = function () {
    // init gizmo
    // init scene

    // 模拟加载延迟
    setTimeout(() => {
        Editor.Ipc.sendToAll('scene:ready');
        panel.$.loading.hidden = true;
    }, 4000);
};

let closeScene = function () {
    Editor.Ipc.sendToAll('scene:close');
    panel.$.loading.hidden = false;
};

export const style = readFileSync(join(__dirname, '../static', '/style/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
};

export const methods = {};

export const messages = {
    'asset-db:ready' () {
        loadScene.call(this);
    },
};

export async function ready () {
    // @ts-ignore
    panel = this;

    let isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
    if (isReady) {
        loadScene.call(panel);
    }
};

export async function beforeClose () {};

export async function close () {
    closeScene.call(panel);
};