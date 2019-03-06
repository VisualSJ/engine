'use strict';

import { shell } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';
const {getPreviewUrl, mixinBase} = require('./../utils');
const template = readFileSync(join(__dirname, '../../static/template/components/web-desktop.html'), 'utf8');
function data() {
    return {
        url: '',
        preview_url: '',
        resolution: {
            width: 1280,
            height: 960,
        },
    };
}
const methods = {
    async init(this: any) {
        this.url = await getPreviewUrl();
        this.preview_url = join(this.url, this.setting.build_path);
        this.data && Object.assign(this.resolution, this.data.resolution);
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
        } else {
            // @ts-ignore
            this.data && Object.assign(this.resolution, this.data.resolution);
        }
    },
};
module.exports = {
    template,
    methods,
    data,
    mixins: [mixinBase],
};
