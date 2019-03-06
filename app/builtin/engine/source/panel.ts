'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const fonts = [
    {
        name: 'engine',
        file: 'packages://engine/static/engine.woff',
    },
];

export const $ = {
    section: '.section',
};

export const methods = {};

export const messages = {};

export async function ready() {
    // @ts-ignore
    panel = this;

    vm = new Vue({
        el: panel.$.section,
        data: {
            type: Editor.Project.type,
            language: '',
        },
        watch: {},
        components: {
            engine: require('../static/components/engine'),
        },
        methods: {

            /**
             * 切换引擎的类型选项卡
             */
            _onChangeEngineType(event: Event, type: string) {
                vm.type = type;
            },
        },
    });

    panel.switchLanguage = (language: string) => {
        vm.language = language;
    };

    Editor.I18n.on('switch', panel.switchLanguage);
}

export async function beforeClose() {}

export async function close() {
    Editor.I18n.removeListener('switch', panel.switchLanguage);
}
