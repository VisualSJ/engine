'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const manager = require('./manager');
const Vue = require('vue/dist/vue.js');
const menu = require('@base/electron-menu');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(
    join(__dirname, '../static', '/template/index.html')
);
/**
 * 配置 console 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'console',
        file: 'packages://console/static/iconfont.woff',
    },
];
export const $ = {
    'console-panel': '.console-panel',
};

export const methods = {
    /**
     * 刷新显示面板
     * 查询对应选中的对象的信息
     */
    async record(log: string) {
        manager.addItem(log);
    },
};

export const messages = {};

export const listeners = {
    /**
     * 窗口缩放时调用更新
     */
    resize() {
        manager.update();
    },
    /**
     * 窗口显示时调用更新
     */
    show() {
        manager.update();
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;
    vm = new Vue({
        el: panel.$['console-panel'],
        data() {
            return {
                change: false,
                tabbar: {
                    fontSize: 12,
                    lineHeight: 26,
                    filterType: 'all',
                    filterRegex: false,
                },
            };
        },
        methods: <any>{
            update() {
                if (!this.change) {
                    this.change = true;
                }
            },
            onClear() {
                Editor.Logger.clear();
                manager.clear();
            },
            onFilterRegex(event: any) {
                manager.setFilterRegex(event.target.value);
                this.dataChange('filterRegex', event.target.value);
            },
            // 筛选 log 信息
            onFilterText(event: any) {
                manager.setFilterText(event.target.value);
            },

            // 设置字体大小
            setFontSize(event: any) {
                manager.setFontSize(event.target.value);
                this.dataChange('fontSize', parseInt(event.target.value, 10));
            },

            // 设置行间距
            setLineHeight(event: any) {
                manager.setLineHeight(event.target.value);
                this.dataChange('lineHeight', parseInt(event.target.value, 10));
            },

            // 点击生成右键菜单
            onOpenMenu(event: any) {
                menu.popup({
                    x: event.pageX,
                    y: event.pageY,
                    menu: [
                        {
                            label: 'editor log',
                            click() {
                                // todo 打开文件对应处理
                            },
                        },
                        {
                            label: 'cocos console log',
                            click() {
                                // todo 打开文件对应处理
                            },
                        },
                    ],
                });
            },
            /**
             * 根据 type 筛选日志
             * @param event
             */
            onFilterType(event: any) {
                manager.setFilterType(event.target.value);
                this.dataChange('filterType', event.target.value);
            },

            /**
             * 翻译
             * @param key
             */
            t(key: string) {
                const name = `consol.${key}`;
                return Editor.I18n.t(name);
            },

            dataChange(key: string, value: any) {
                this.tabbar[key] = value;
                Editor.Ipc.sendToPackage('console', 'set-setting', `tabbar.${key}`, value);
                Editor.Ipc.sendToPackage('console', 'save-setting');
            },

            /**
             * 初始化数据
             */
            async ininData() {
                const tabbar = await Editor.Ipc.requestToPackage('console', 'get-setting', 'tabbar');
                if (!tabbar) {
                    return;
                }
                for (const key of Object.keys(tabbar)) {
                    if (key in this.tabbar && tabbar[key]) {
                        this.tabbar[key] = tabbar[key];
                    }
                }
            },
        },
        components: {
            'console-list': require('./components/list'),
        },
        async mounted() {
            await this.ininData();
            manager.setUpdateFn(this.update);
            manager.setLineHeight(this.tabbar.lineHeight);
            const list = Editor.Logger.query();
            manager.addItems(list);
            Editor.Logger.on('record', panel.record);
        },
    });
}

export async function beforeClose() {}

export async function close() {
    manager.setUpdateFn(null);
    Editor.Logger.removeListener('record', panel.record);
}
