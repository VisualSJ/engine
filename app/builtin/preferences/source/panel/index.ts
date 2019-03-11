'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
const {app} = require('electron').remote;

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let $vm: any;

export const style = readFileSync(join(__dirname, '../index.css'));

export const template = readFileSync(join(__dirname, '../../static/template/index.html'));

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
    'update-tab'(name: string) {
        $vm.tab = name;
    },
};

export async function ready() {

    // @ts-ignore
    panel = this;

    const home = require('./components/home');
    home.el = panel.$.preferences;
    $vm = new Vue(home);
}

export async function beforeClose() {}

export async function close() {}
