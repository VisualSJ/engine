'use strict';

import { shell } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
const {getPreviewUrl, mixinBase} = require('./../utils');
const template = readFileSync(join(__dirname, '../../static/template/components/web-mobile.html'), 'utf8');
function data() {
    return {
        url: '',
        preview_url: '',
        eruda: false,
    };
}

const methods = {

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

    /**
     * 观察对象变化通知
     * @param {string} type
     */
    updateData(type: string) {
        if (type === 'setting') {
            // @ts-ignore
            this.preview_url = join(this.url, this.setting.build_path);
        }
    },
};

module.exports = {
    template,
    methods,
    data,
    mixins: [mixinBase],
};
