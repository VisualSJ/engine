'use strict';

import { existsSync, readFileSync } from 'fs';
import { copySync, ensureDirSync, outputJsonSync, readJsonSync } from 'fs-extra';
import { basename , join } from 'path';
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

/**
 * 配置 pkg-manager 的 iconfont 图标
 */
export const fonts = [{
    name: 'pkg-manager',
    file: 'packages://pkg-manager/static/iconfont.woff',
}];

export const methods = {};

export const messages = {
    // 更新获取的 packages 信息
    'pkg-manager:update-packages'() {
        vm.init();
    }
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
                home: '全局',
                // store: '商店',
            },
            activeTab: 'internal',
        },
        mounted() {
            this.init();
            Editor.Ipc.sendToPackage('pkg-manager', 'start-watch');
        },
        computed: {
            // @ts-ignore
            activePackages() {
                // @ts-ignore
                return this.packages.filter((item: any) => {
                    // @ts-ignore
                    return (item.type === this.activeTab) && (item.name.indexOf(this.queryKey) !== -1);
                });
            }
        },
        methods: <any>{
            /**
             * 初始化，获取已加载的插件包信息
             */
            async init() {
                const packages = await Editor.Ipc.requestToPackage('pkg-manager', 'get-packgaes');
                this.packages = packages;
            },
            /**
             * 查询插件
             */
            query(event: any) {
                this.queryKey = event.target.value;
            },
            // 新建插件
            newPlugin(event: any) {
                // @ts-ignore
                const pkgPath = join(Editor.App[this.activeTab], './packages');
                const path = join(pkgPath, './package');
                const templatePath = join(__dirname, './../static/package');
                if (!existsSync(pkgPath)) {
                    ensureDirSync(pkgPath);
                }
                Editor.Dialog.saveFile({
                    title: '请输入插件名称',
                    root: path,
                    label: '创建插件包',
                }).then((filePath: string) => {
                    if (!filePath) {
                        return;
                    }
                    const json = readJsonSync(join(templatePath, './package.json'));
                    json.name = basename(filePath);
                    outputJsonSync(join(templatePath, './package.json'), json);
                    // @ts-ignore
                    copySync(templatePath, filePath);
                });
            },
            // 导入插件
            addPlugin(event: any) {
                Editor.Dialog.openDirectory({
                    title : '请选择插件包文件夹'
                });
            },
        },
        components: {
            'pkg-item': require('./components/pkg-item'),
        },
    });

}

export async function beforeClose() {}
export async function close() {}
