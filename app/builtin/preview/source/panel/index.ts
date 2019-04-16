'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

import { init, queryPreviewData } from './query';

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let resizeTimer: any = null;

export const style = readFileSync(join(__dirname, '../../static/style/index.css'));

export const template = readFileSync(join(__dirname, '../../static', '/template/index.html'));

export const $ = {
    preview: '.preview',
    image: '.image',
    automatic: '.automatic',
    windows: '.windows',
};

export const listeners = {
    resize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            panel.resize();
        }, 400);
    },
};

export const methods = {
    /**
     * 更新分辨率
     */
    resize() {
        panel.width = panel.$.preview.clientWidth;
        panel.height = panel.$.preview.clientHeight;
        panel.$.image.width = panel.width;
        panel.$.image.height = panel.height;
        panel.image = new ImageData(panel.width, panel.height);
        panel.update();
        requestAnimationFrame(panel.update);
    },

    /**
     * 更新整个预览画面
     */
    async update() {
        if (!panel || !panel.$.image || panel.updateLock) {
            return;
        }
        panel.updateLock = true;
        console.time('draw');
        const buffer: any = await queryPreviewData(panel.$.windows.value, panel.width, panel.height);
        if (buffer) {
            buffer.copy(panel.image.data);
        }
        const ctx = panel.$.image.getContext('2d');
        ctx.putImageData(panel.image, 0, 0);

        console.timeEnd('draw');
        panel.updateLock = false;

        if (panel.automatic) {
            requestAnimationFrame(panel.update);
        }
    },

    /**
     * 更新按钮上的文字说明
     */
    updateText(windows: any[]) {
        panel.$.automatic.innerHTML = Editor.I18n.t('preview.automatic');
        panel.$.automatic.setAttribute('tooltip', Editor.I18n.t('preview.automatic_tooltip'));

        panel.$.windows.innerHTML = '';
        windows.forEach((item) => {
            const $option = document.createElement('option');
            $option.innerHTML = `Display ${item.index}${item.name.length ? ' - ' + item.name : ''}`;
            $option.value = item.index;
            panel.$.windows.appendChild($option);
        });

        // todo ui bug
        requestAnimationFrame(() => {
            if (panel.$.windows.value === null) {
                panel.$.windows.value = 0;
            }
        });
    },
};

export const messages = {
    async 'scene:ready'() {
        const info = await Editor.Ipc.requestToPanel('scene', 'query-preview-info');
        await init(info.id);
        panel.resize();
        panel.update();
        panel.updateText(info.windows);
    },

    'scene:close'() {},

    async 'scene:change-node'() {
        const info = await Editor.Ipc.requestToPanel('scene', 'query-preview-info');
        panel.updateText(info.windows);
        requestAnimationFrame(panel.update);
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;
    const info = await Editor.Ipc.requestToPanel('scene', 'query-preview-info');
    await init(info.id);
    panel.resize();
    panel.update();
    panel.updateText(info.windows);

    panel.$.automatic.addEventListener('confirm', () => {
        panel.automatic = !!panel.$.automatic.value;
        panel.update();
    });

    panel.$.windows.addEventListener('confirm', () => {
        panel.automatic = !!panel.$.automatic.value;
        panel.update();
    });
}

export async function beforeClose() { }

export async function close() {}
