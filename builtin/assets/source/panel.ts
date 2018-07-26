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

    /**
     * asset db 准备就绪
     * 去除 loading 状态，并且显示节点树
     */
    'asset-db:ready' () {
        panel.$.loading.hidden = true;
        vm.ready = true;
        panel.refresh();
    },

    /**
     * asset db 关闭
     * 打开 loading 状态，并隐藏节点树
     */
    'asset-db:close' () {
        panel.$.loading.hidden = false;
        vm.ready = false;
        vm.list = [];
    },

    /**
     * asset db 广播通知添加了 asset
     * 在显示的节点树上添加上这个资源
     */
    async 'asset-db:asset-add' (event: IPCEvent, uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }

        let info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        if (
            !vm.list.length || vm.list.some((item: any) => {
                return item.source !== info.source;
            })
        ) {
            vm.list.push(info);
        }
    },

    /**
     * asset db 广播通知删除了 asset
     * 在显示的节点树上删除这个资源
     */
    async 'asset-db:asset-delete' (event: IPCEvent, uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }

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

    vm = new Vue({
        el: panel.$.content,
        data: {
            ready: isReady,
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

    // db 就绪状态才需要查询数据
    isReady && panel.refresh();
};

export async function beforeClose () {}

export async function close () {}
