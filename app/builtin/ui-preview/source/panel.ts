'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

const profile = Editor.Profile.load('profile://global/packages/ui-preview');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    'ui-preview': '.ui-preview',
};

export const methods = {};

export const messages = {};

export async function ready() {
    // @ts-ignore
    panel = this;
    vm = new Vue({
        el: panel.$['ui-preview'],
        data: {
            uiCollectors: {
                Input: [
                    'input',
                    'num-input',
                    'checkbox',
                    'select',
                    'color',
                    'textarea',
                    'slider',
                    'drag',
                ],

                Extension: [
                    'color-picker',
                    'button',
                    'progress',
                    'dialog',
                ],

                Layout: [
                    'loading',
                    'label',
                    'prop',
                    'section',
                ],
            },

            chooseIndex: profile.get('tab') || 'input',
        },
        beforeCreate() {

        },
        methods: <any>{
            /**
             * select的change回调事件
             * @param event
             */
            selectChange(event: any) {
                this.chooseIndex = event.target.value;
                profile.set('tab', event.target.value);
            },
        },
        components: {
            'test-button': require('./components/ui-button'),
            'test-input': require('./components/ui-input'),
            'test-checkbox': require('./components/ui-checkbox'),
            'test-num-input': require('./components/ui-num-input'),
            'test-slider': require('./components/ui-slider'),
            'test-select': require('./components/ui-select'),
            'test-section': require('./components/ui-section'),
            'test-color-picker': require('./components/ui-color-picker'),
            'test-color': require('./components/ui-color'),
            'test-loading': require('./components/ui-loading'),
            'test-drag': require('./components/ui-drag'),
            'test-prop': require('./components/ui-prop'),
            'test-textarea': require('./components/ui-textarea'),
            'test-progress': require('./components/ui-progress'),
            'test-label': require('./components/ui-label'),

            'test-dialog': require('./components/ui-dialog'),
        },
    });

}

export async function beforeClose() {}
export async function close() {
    profile.save();
}
