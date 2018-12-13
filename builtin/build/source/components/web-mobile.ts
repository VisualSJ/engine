'use strict';

import { shell } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
const {getPreviewUrl} = require('./../utils');

export const template = readFileSync(join(__dirname, '../../static/template/components/web-mobile.html'), 'utf8');
export function data() {
    return {
        url: '',
        preview_url: '',
        eruda: false,
    };
}

export const watch = {
    setting: {
        deep: true,
        handler() {
           // @ts-ignore
            this.preview_url = join(url, this.setting.build_path);
        },
    },
    data: {
        deep: true,
        handler() {
           // @ts-ignore
            if (this.data) {
                // @ts-ignore
                this.eruda = this.data.eruda;
            }
        },
    },
};

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string) {
        const name = `build.${key}`;
        return Editor.I18n.t(name);
    },

    async init() {
        // @ts-ignore
        this.url = await getPreviewUrl();
        // @ts-ignore
        this.preview_url = join(this.url, this.setting.build_path);
    },

    // 预览该路径地址
    preview() {
        // @ts-ignore
        shell.openExternal(this.preview_url);
    },

    // 数据变化
    onConfirm(event: any) {
        const key = event.target.path;
        if (!key) {
            return;
        }
        // @ts-ignore
        this[key] = event.target.value;
        // @ts-ignore
        this.$emit('data-change', this.setting.platform, key, event.target.value);
    },
};
export const props: object = [
    'setting',
    'data',
];

export function mounted() {
    // @ts-ignore
    this.init();
}

export async function beforeClose() {}

export async function close() {}
