'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;

export const style = readFileSync(
    join(__dirname, '../dist/index.css')
);

export const template = readFileSync(
    join(__dirname, '../static', '/template/index.html')
);

/**
 * 配置 inspector 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'inspector',
        file: 'packages://inspector/static/iconfont.woff'
    }
];

export const $ = {
    content: '.content'
};

export const messages = {
    /**
     * 场景已准备
     */
    'scene:ready'() {
        vm && (vm.sready = true);
    },

    /**
     * 场景已准备
     */
    'scene:close'() {
        vm && (vm.sready = false);
    },

    /**
     * 选中某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    'selection:select'(type: string, uuid: string) {
        if (vm) {
            setTimeout(() => {
                vm.element = type;
                vm.uuid = uuid;
            }, 200);
        }
    },

    /**
     * 比对节点根据diff结果修改
     * @param {string} uuid
     */
    async 'scene:node-changed'(uuid: string) {
        if (vm) {
            vm.$refs.inspector2d && vm.$refs.inspector2d.refresh();
            vm.$refs.inspector3d && vm.$refs.inspector3d.refresh();
        }
    }
};

export const listeners = {};

export async function ready() {
    // @ts-ignore
    panel = this;

    // 初始化 vue
    vm = new Vue({
        el: panel.$.content,

        data: {
            loading: false,
            sready: false, // 场景是否准备就绪
            aready: false, // db 是否准备就绪

            type: Editor.Project.type, // 项目类型

            element: '', // 最后选中的物体 asset | node
            uuid: '' // 选中的物体的 uuid
        },

        components: {
            'inspector-2d': require('../static/components/2d'),
            'inspector-3d': require('../static/components/3d'),
        },

        async mounted() {
            const type = await Editor.Ipc.requestToPackage(
                'selection',
                'query-last-select-type'
            );
            const uuid = await Editor.Ipc.requestToPackage(
                'selection',
                'query-last-select',
                type
            );

            this.element = type;
            this.uuid = uuid;
        },
        methods: {
            toggleLoading(val: boolean) {
                vm.loading = val;
            }
        }
    });
}

export async function beforeClose() {}

export async function close() {}
