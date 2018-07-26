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
     * 查询对应选中的对象的信息
     */
    async refresh () {
        
    }
};

export const messages = {

    /**
     * 场景准备就绪
     */
    'scene:ready' () {
        vm.sceneReady = true;
    },

    /**
     * 资源数据库准备就绪
     */
    'asset-db:ready' () {
        vm.assetReady = true;
    },

    /**
     * 关闭场景
     */
    'scene:close' () {
        vm.sceneReady = false;
    },

    /**
     * 资源数据库关闭
     */
    'asset-db:close' () {
        vm.assetReady = false;
    },
};

export async function ready () {
    // @ts-ignore
    panel = this;

    let sceneIsReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');
    let assetIsReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');

    vm = new Vue({
        el: panel.$.content,
        data: {
            sceneReady: sceneIsReady,
            assetReady: assetIsReady,
        }
    });
};

export async function beforeClose () {}

export async function close () {}
