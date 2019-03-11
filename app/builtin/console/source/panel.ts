'use strict';

import { shell } from 'electron';
import { existsSync , readFileSync } from 'fs';
import { outputFileSync } from 'fs-extra';
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
            onHeaderChange(event: any) {
                if (!event.target.getAttribute('path')) {
                    return;
                }
                const value = event.target.value;
                switch (event.target.getAttribute('path')) {
                    case 'clear':
                        Editor.Logger.clear();
                        manager.clear();
                        break;
                    case 'filterRegex':
                        manager.setFilterRegex(value);
                        this.dataChange('filterRegex', value);
                        break;
                    case 'filterText':
                        manager.setFilterText(value);
                        break;
                    case 'filterType':
                        manager.setFilterType(value);
                        this.dataChange('filterType', value);
                        break;
                    case 'fontSize':
                        const fontSize = parseInt(value, 10);
                        manager.setFontSize(fontSize);
                        this.dataChange('fontSize', fontSize);
                        break;
                    case 'lineHeight':
                        const lineHeight = parseInt(value, 10);
                        manager.setLineHeight(lineHeight);
                        this.dataChange('lineHeight', lineHeight);
                        break;
                    case 'openLog':
                        const path = join(Editor.Project.path, 'local', 'logs', 'project.log');
                        if (!existsSync(path)) {
                            outputFileSync(path, '', 'utf-8');
                        }
                        shell.openItem(path);
                        break;
                    case 'showDate':
                        manager.showDate(!!value);
                        break;
                }
            },
            update() {
                if (!this.change) {
                    this.change = true;
                }
            },

            /**
             * 翻译
             * @param key
             */
            t(key: string) {
                const name = `console.${key}`;
                return Editor.I18n.t(name);
            },

            dataChange(key: string, value: any) {
                this.tabbar[key] = value;
                Editor.Ipc.sendToPackage('console', 'set-config', 'global', `tabbar.${key}`, value);
            },

            /**
             * 初始化数据
             */
            async ininData() {
                const tabbar = await Editor.Ipc.requestToPackage('console', 'get-config', 'global', 'tabbar');
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
