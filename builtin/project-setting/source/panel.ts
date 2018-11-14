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
                simulator_setting_type: 'global',
                simulator_device_orientation: 'vertical',
                simulator_resolution: 'iphone4',
                simulator_width: 960,
                simulator_height: 480,
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
                    this.set('simulator_setting_type', 'preview');
                    // @ts-ignore
                    this.set('simulator_device_orientation', 'preview');
                    // @ts-ignore
                    this.set('simulator_width', 'preview');
                    // @ts-ignore
                    this.set('simulator_height', 'preview');
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
                const name = `project-setting.${key}`;
                return Editor.I18n.t(name);
            },

            /**
             * 查询项目配置
             * @param {*} key
             */
            async get(key: string, type: string) {
                const result = await Editor.Ipc.requestToPackage('project-setting', 'get-setting', `${type}.${key}`);
                return result;
            },

            /**
             * 设置项目设置信息
             * @param {*} str
             */
            set(key: string, type: string) {
                Editor.Ipc.sendToPackage('project-setting', 'set-setting', `${type}.${key}`, this[type][key]);
            },

            /**
             * 保存项目设置信息
             */
            save() {
                Editor.Ipc.sendToPackage('project-setting', 'save-setting');
            },

            async getData(type: string) {
                const keys = Object.keys(this[type]);
                const config = await Editor.Ipc.requestToPackage('project-setting', 'get-setting', type);
                for (const key of keys) {
                    if (key in config) {
                        this.preview[key] = config[key];
                    }
                }
            }
        },
        mounted() {
            this.getData('preview');
        },
    });
}

export async function beforeClose() {}

export async function close() {}
