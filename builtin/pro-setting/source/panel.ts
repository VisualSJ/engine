'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    project: '.project'
};

export const methods = {};

export const messages = {};

export async function ready() {

    // @ts-ignore
    panel = this;

    new Vue({
        el: panel.$.project,
        data: {
            tab: 0,
            preview: {
                start_scene: 'current_scene',
                design_width: 960,
                design_height:  480,
                fit_width: true,
                fit_height: false,
                simulatorSettingType: 'global',
                simulator_device_orientation: 'vertical',
                simulator_resolution: 'iphone4',
                customize_resolution_width: 960,
                customize_resolution_height: 480,
            }
        },

        watch: {
            preview: {
                deep: true,
                handler() {
                    // @ts-ignore
                    this.set('start_scene', 'preview');
                    // @ts-ignore
                    this.set('design_width', 'preview');
                    // @ts-ignore
                    this.set('design_height', 'preview');
                    // @ts-ignore
                    this.set('fit_width', 'preview');
                    // @ts-ignore
                    this.set('fit_height', 'preview');
                    // @ts-ignore
                    this.set('simulatorSettingType', 'preview');
                    // @ts-ignore
                    this.set('simulator_device_orientation', 'preview');
                    // @ts-ignore
                    this.set('customize_resolution_width', 'preview');
                    // @ts-ignore
                    this.set('customize_resolution_height', 'preview');
                    // @ts-ignore
                    this.save();
                }
            }
        },

        components: {
            'content-preview': require('../static/components/preview'),
        },

        methods: <any>{
            /**
             * 翻译
             * @param key
             */
            t(key: string) {
                const name = `pro-setting.${key}`;
                return Editor.I18n.t(name);
            },

            /**
             * 查询项目配置
             * @param {*} key
             */
            async get(key: string, type: string) {
                return await Editor.Ipc.requestToPackage('pro-setting', 'get-setting', `${type}.${key}`);
            },

            /**
             * 设置项目设置信息
             * @param {*} str
             */
            set(key: string, type: string) {
                Editor.Ipc.sendToPackage('pro-setting', 'set-setting', `${type}.${key}`, this[type][key]);
            },

            /**
             * 保存项目设置信息
             */
            save() {
                Editor.Ipc.sendToPackage('pro-setting', 'save-setting');
            },

            async getData(type: string) {
                const keys = Object.keys(this[type]);
                // 利用文件列表，生成 promise 任务，并并行执行
                Promise.all(keys.map((key) => {
                    const value = this.get(key);
                    if (value && typeof(value) !== 'object') {
                        this[type][key] = value;
                    }
                })).catch((error) => {
                    console.log(`get project setting error: ${error}`);
                });
            }
        },
        mounted() {
            this.getData('preview');
        },
    });
}

export async function beforeClose() {}

export async function close() {}
