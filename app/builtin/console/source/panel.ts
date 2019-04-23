'use strict';

import { shell } from 'electron';
import { existsSync , readFileSync } from 'fs';
import { outputFileSync } from 'fs-extra';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');
Vue.config.productionTip = false;
Vue.config.devtools = false;

const manager = require('./manager');

const profile = Editor.Profile.load('profile://global/packages/console.json');

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

export const messages = {
    refresh() {
        vm && vm.init();
    },
};

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

        data: {
            change: false,
            tabbar: {
                displayDate: profile.get('panel.displayDate'),
                fontSize: profile.get('panel.fontSize'),
                lineHeight: profile.get('panel.lineHeight'),
    
                filterType: 'all',
                filterRegex: false,
            },
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
                        break;
                    case 'filterText':
                        manager.setFilterText(value);
                        break;
                    case 'filterType':
                        manager.setFilterType(value);
                        break;
                    case 'openLog':
                        const path = join(Editor.Project.path, 'local', 'logs', 'project.log');
                        if (!existsSync(path)) {
                            outputFileSync(path, '', 'utf-8');
                        }
                        shell.openItem(path);
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

            /**
             * 初始化显示数据
             */
            init() {
                this.tabbar.displayDate = profile.get('panel.displayDate');
                this.tabbar.fontSize = profile.get('panel.fontSize');
                this.tabbar.lineHeight = profile.get('panel.lineHeight');

                manager.showDate(this.tabbar.displayDate);
                manager.setLineHeight(this.tabbar.lineHeight);
            },
        },

        components: {
            'console-list': require('./components/list'),
        },

        async mounted() {
            this.init();
        },
    });

    // 初始化日志列表
    manager.setUpdateFn(vm.update);
    const list = Editor.Logger.query();
    manager.addItems(list);
    Editor.Logger.on('record', panel.record);
}

export async function beforeClose() {}

export async function close() {
    // 取消之前监听的日志处理事件
    manager.setUpdateFn(null);
    Editor.Logger.removeListener('record', panel.record);
}
