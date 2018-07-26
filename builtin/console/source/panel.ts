'use strict';

import { join } from 'path';
import { readFileSync } from 'fs';

let panel: any = null;
let vm: any = null;

const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../static', '/style/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    console: '.console',
};

export const methods = {

    /**
     * 刷新显示面板
     * 查询对应选中的对象的信息
     */
    async record (log: string) {
        vm.list.push(log);
    }
};

export const messages = {};

export async function ready () {
    // @ts-ignore
    panel = this;

    let list = Editor.Logger.query();

    vm = new Vue({
        el: panel.$.console,
        data: {
            list,
        }
    });

    Editor.Logger.on('record', panel.record);
};

export async function beforeClose () {}

export async function close () {
    Editor.Logger.removeListener('record', panel._record);
}
