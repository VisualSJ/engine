'use strict';

import { join } from 'path';
import { readFileSync } from 'fs';

let panel: any = null;
let vm: any = null;

const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    content: '.content',
};

export const methods = {

};

export const messages = {

    /**
     * 选中某个物体
     */
    async 'selection:select' (event: IPCEvent, type: string, uuid: string) {
        vm.loading = true;
        
        if (type === 'asset') {

            let info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
            let meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', uuid);

            vm.asset.info = info;
            vm.asset.meta = meta;

            vm.type = 'asset';
        } else if (type === 'node') {
            let node = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);

            vm.node = node;

            vm.type = 'node';
        } else {
            vm.type = '';
        }

        vm.loading = false;
    },
};

export async function ready () {
    // @ts-ignore
    panel = this;

    // 初始化 vue
    vm = new Vue({
        el: panel.$.content,
        data: {
            loading: false,
            type: '',
            asset: {
                info: null,
                meta: null,
            },
            node: {

            },
        },
        components: {
            asset: require('./components/asset'),
            node: require('./components/node'),
        },
    });
};

export async function beforeClose () {}

export async function close () {}
