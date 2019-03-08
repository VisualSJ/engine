'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

let panel: any = null;

export const style = readFileSync(join(__dirname, '../index.css'));

export const template = readFileSync(join(__dirname, '../../static/template/index.html'));

export const $ = {
    project: '.project-settings',
};

export const methods = {};

export const messages = {};

export async function ready() {
    // @ts-ignore
    panel = this;

    const Vue = require('vue/dist/vue.js');
    Vue.config.productionTip = false;
    Vue.config.devtools = false;

    const home = require('./components/home');
    home.el = panel.$.project;
    panel.vm = new Vue(home);
}

export async function beforeClose() {}

export async function close() {}
