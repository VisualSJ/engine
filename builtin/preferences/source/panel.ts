'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
const {app} = require('electron').remote;

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const LANGUAGE = ['en', 'zh'];

let panel: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));
let $vm: any;
export const $ = {
    language: '.language',
    preferences: '.preferences',
};

export const methods = {};
export const messages = {
    /**
     * 设置设置面板的 tab 索引
     * @param index
     */
    'update-tab'(tabIndex: number) {
        $vm.tab = tabIndex;
    },
};

export async function ready() {

    // @ts-ignore
    panel = this;

    $vm = new Vue({
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
            data_editor: {
                auto_compiler_scripts: true,
                external_script_editor: 'internal',
                external_picture_editor: 'internal',
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
            data_editor: {
                deep: true,
                handler() {
                    // @ts-ignore
                    this.dataChange('data_editor');
                },
            },
        },

        components: {
            'content-general': require('../static/components/general'),
            'content-preview': require('../static/components/preview'),
            'content-data-editor': require('../static/components/data-editor'),
        },

        methods: <any>{
            dataChange(type: string) {
                // @ts-ignore
                Object.keys(this[type]).forEach((key) => {
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
                            this[type][key] = config[key];
                        }
                    }
                }
            },
        },
        mounted() {
            let lan = app.getLocale();
            if (lan.indexOf('zh') >= 0) {
                lan = 'zh';
            } else {
                lan = 'en';
            }
            this.general.language = lan;
            this.getData('general');
            this.getData('preview');
            this.getData('data_editor');
        },
    });
}

export async function beforeClose() {}

export async function close() {}
