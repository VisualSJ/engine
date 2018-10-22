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

export const $ = {
    'package-manager': '.package-manager'
};

export const methods = {};

export const messages = {};

export async function ready() {
    // @ts-ignore
    panel = this;
    vm = new Vue({
        el: panel.$['package-manager'],
        data: {
            queryKey: '', // 查找关键词
            package: [
            'preferences',
            'engine',
            'selection',
            'asset-db',
            'console',
            'scene',
            'assets',
            'inspector',
            'hierarchy',
            'ui-preview',
            'pkg-manager',
            'preview', ],
            packagePath: []
        },
        mounted() {
            this.package.forEach((name: string) => {
                this.packagePath.push(join(__dirname, './../../' + name));
            });
        },
        methods: <any>{
            /**
             * 查询插件
             * @param {string} key
             */
            query(event: any) {
                this.queryKey = event.target.value;
            }
        },
        components: {
            'pkg-item': require('./components/pkg-item'),
        },
    });

}

export async function beforeClose() {}
export async function close() {}
