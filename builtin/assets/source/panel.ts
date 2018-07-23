'use strict';

import { join } from 'path';
import { readFileSync } from 'fs';

let panel: any = null;
let vm: any = null;

const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../static', '/style/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    content: '.content',
};

export const methods = {

    /**
     * 刷新显示面板
     */
    async refresh () {
        let tree = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');
        vm.list = tree;
    }
};

export const messages = {

    'asset-db:ready' () {
        panel.$.loading.hidden = true;
        panel.$.content.hidden = false;
        panel.refresh();
    },

    'asset-db:close' () {
        panel.$.loading.hidden = false;
        panel.$.content.hidden = true;
        panel.refresh();
    },

    async 'asset-db:asset-add' (event: IPCEvent, uuid: string) {
        let info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        if (
            !vm.list.length || vm.list.some((item: any) => {
                return item.source !== info.source;
            })
        ) {
            vm.list.push(info);
        }
    },

    async 'asset-db:asset-delete' (event: IPCEvent, uuid: string) {
        vm.list.some((item: any, index: number) => {
            if (item.uuid === uuid) {
                vm.list.splice(index, 1);
                return true;
            }
        });
    },
};

export async function ready () {
    // @ts-ignore
    panel = this;

    let isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
    panel.$.loading.hidden = isReady;
    panel.$.content.hidden = !isReady;

    vm = new Vue({
        el: panel.$.content,
        data: {
            list: [],
        },
        methods: {
            addTestAsset () {
                let name = new Date().getTime();
                Editor.Ipc.sendToPackage('asset-db', 'create-asset', `db://assets/${name}.txt`, name);
            },
            deleteTestAsset (event: any, uuid: string) {
                Editor.Ipc.sendToPackage('asset-db', 'delete-asset', uuid);
            },
        },
    });
    panel.refresh();
};

export async function beforeClose () {}

export async function close () {}
