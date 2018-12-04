'use strict';

import { existsSync, readFileSync } from 'fs';
import { ensureDirSync } from 'fs-extra';
import { join } from 'path';
const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    'package-manager': '.package-manager',
};

/**
 * 配置 package-manager 的 iconfont 图标
 */
export const fonts = [{
    name: 'package-manager',
    file: 'packages://package-manager/static/iconfont.woff',
}];

export const methods = {};

export const messages = {
    // 更新获取的 packages 信息
    'package-manager:update-packages'() {
        vm.init();
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;
    vm = new Vue({
        el: panel.$['package-manager'],
        data: {
            queryKey: '', // 查找关键词
            packages: [],
            tabs: {
                internal: '内置',
                project: '项目',
                global: '全局',
                // store: '商店',
            },
            activeTab: 'internal',
        },
        mounted() {
            this.init();
            // Editor.Ipc.sendToPackage('package-manager', 'start-watch');
        },
        computed: {
            // @ts-ignore
            activePackages() {
                // @ts-ignore
                return this.packages.filter((item: any) => {
                    // @ts-ignore
                    return (item.type === this.activeTab) && (item.info.name.indexOf(this.queryKey) !== -1);
                });
            },
        },
        methods: <any>{
            /**
             * 初始化，获取已加载的插件包信息
             */
            async init() {
                // @ts-ignore
                const list = Editor.remote.Package.getPackages().map((item: any) => {
                    return {
                        name: item.info.name,
                        enable: item.enable,
                        info: item.info,
                        invalid: item.invalid,
                        path: item.path,
                    };
                });
                list.forEach((item: any) => {
                    if (item.path.indexOf(Editor.App.path) !== -1) {
                        item.type = 'internal';
                    } else if (item.path.indexOf(Editor.App.home) !== -1) {
                        item.type = 'global';
                    } else {
                        item.type = 'project';
                    }
                    delete item.pkg;
                });
                this.packages = list;
            },
            /**
             * 查询插件
             */
            query(event: any) {
                this.queryKey = event.target.value;
            },
            // 新建插件
            addPlugin() {
                // Editor.Ipc.sendToPackage('package-manager', 'add-packages', this.activeTab);
            },
            // 导入插件
            importPlugin() {
                // Editor.Ipc.sendToPackage('package-manager', 'import-packages', this.activeTab);
            },
        },
        components: {
            'pkg-item': require('./components/pkg-item'),
        },
    });

}

export async function beforeClose() { }
export async function close() { }
