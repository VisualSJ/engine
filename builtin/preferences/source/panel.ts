'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const LANGUAGE = ['en', 'zh'];

let panel: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    language: '.language',
    preferences: '.preferences',
};

export const methods = {};

export const messages = {};

export async function ready() {

    // @ts-ignore
    panel = this;

    new Vue({
        el: panel.$.preferences,

        data: {
            tab: 0,
            general: {
                language: 'zh',
                themeColor: 'default',
                step:  0.01,
                node_tree: 'memory_last_state',
            },
            preview: {
                auto_refresh: true,
                preview_browser: 'default',
                simulator_path: './builtin/preview/simulator/win32',
                simulator_orientation: 'vertical',
                simulator_resolution: 'iphone4',
                simulator_width: 960,
                simulator_height: 480,
                simulator_debugger:  false,
            },
        },

        watch: {
            general: {
                deep: true,
                handler() {
                   // @ts-ignore
                   this.dataChange('general');
                },
            },
            preview: {
                deep: true,
                handler() {
                    // @ts-ignore
                    this.dataChange('preview');
                },
            },
        },

        components: {
            'content-general': require('../static/components/general'),
            'content-preview': require('../static/components/preview'),
        },

        methods: <any>{
            dataChange(type: string) {
                // @ts-ignore
                Object.keys(this.preview).forEach((key) => {
                    // @ts-ignore
                    this.set(key, type);
                });
                // @ts-ignore
                this.save();
            },

            /**
             * 翻译
             * @param key
             */
            t(key: string) {
                const name = `preferences.${key}`;
                return Editor.I18n.t(name);
            },

            /**
             * 查询项目配置
             * @param {*} key
             */
            async get(key: string, type: string) {
                return await Editor.Ipc.requestToPackage('preferences', 'get-setting', `${type}.${key}`);
            },

            /**
             * 设置项目设置信息
             * @param {*} str
             */
            set(key: string, type: string) {
                Editor.Ipc.sendToPackage('preferences', 'set-setting', `${type}.${key}`, this[type][key]);
            },

            /**
             * 保存项目设置信息
             */
            save() {
                Editor.Ipc.sendToPackage('preferences', 'save-setting');
            },

            async getData(type: string) {
                const keys = Object.keys(this[type]);
                const config = await Editor.Ipc.requestToPackage('preferences', 'get-setting', type);
                if (config) {
                    for (const key of keys) {
                        if (key in config && config[key]) {
                            this.preview[key] = config[key];
                        }
                    }
                }
            },
        },
        mounted() {
            this.getData('general');
            this.getData('preview');
        },
    });
}

export async function beforeClose() {}

export async function close() {}
