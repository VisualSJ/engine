'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const profile = Editor.Profile.load('profile://global/packages/preferences.json');
const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const LANGUAGE = ['en', 'zh'];

let panel: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    language: '.language',
    preferences: '.preferences'
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
                language: profile.get('language') || 'en',
                themeColor: profile.get('themeColor') || 'light',
                step: profile.get('step') || 1,
            },
            preview: {
                autoRefresh: profile.get('autoRefresh') || true,
                previewBrowser: profile.get('previewBrowser') || 'default',
                simulatorPath: profile.get('simulatorPath') || '/simulatorPath/',
            }
        },

        watch: {
            general: {
                deep: true,
                handler() {
                    // @ts-ignore
                    profile.set('language', this.general.language);
                    // @ts-ignore
                    profile.set('step', this.general.step);
                    // @ts-ignore
                    profile.set('themeColor', this.general.themeColor);
                    profile.save();
                },
            },
            preview: {
                deep: true,
                handler() {

                }
            }
        },

        components: {
            'content-general': require('../static/components/general'),
            'content-preview': require('../static/components/preview'),
        },

        methods: <any>{
            /**
             * 翻译
             * @param key
             */
            t(key: string) {
                const name = `preferences.${key}`;
                return Editor.I18n.t(name);
            },
        }
    });
}

export async function beforeClose() {}

export async function close() {}
