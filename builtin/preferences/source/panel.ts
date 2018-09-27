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
                language: profile.get('language'),
                // theme: profile.get('theme'),
                // ip: profile.get('ip'),
                step: profile.get('step'),
            },
        },

        watch: {
            general: {
                deep: true,
                handler() {
                    // @ts-ignore
                    profile.set('language', this.general.language);
                    // @ts-ignore
                    profile.set('step', this.general.step);
                    profile.save();
                },
            }
        },

        components: {
            'content-general': require('../static/components/general'),
        },

        methods: <any>{
            /**
             * 翻译
             * @param key
             */
            t(key: string, language: string) {
                const name = `preferences.${key}`;
                return Editor.I18n.t(name);
            },
        }
    });
}

export async function beforeClose() {}

export async function close() {}
