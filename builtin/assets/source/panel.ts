'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

/**
 * 配置 assets 的 iconfont 图标
 */
export const fonts = [{
    name: 'assets',
    file: 'packages://assets/static/iconfont.woff',
}];

export const $ = {
    content: '.content',
};

export const methods = {
    /**
     * 刷新面板
     */
    async refresh() {
        vm.refresh();
    },
    /**
     * 全选
     * 也配置成为了键盘事件，下同
     */
    async selectAll(event: Event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        vm.$refs.tree.allSelect();
    },
    /**
     * 焦点面板搜索
     */
    async find() {
        vm.$refs.search.focus();
    },
    /**
     * 复制资源
     */
    async copy() {
        vm.$refs.tree.copy();
    },
    /**
     * 粘贴资源
     */
    async paste() {
        vm.$refs.tree.paste();
    },
    /**
     * 删除资源
     */
    async delete() {
        vm.$refs.tree.delete();
    },
    async up() {
        vm.$refs.tree.upDownLeftRight('up');
    },
    async down() {
        vm.$refs.tree.upDownLeftRight('down');
    },
    async left() {
        vm.$refs.tree.upDownLeftRight('left');
    },
    async right() {
        vm.$refs.tree.upDownLeftRight('right');
    },
    async shiftUp() {
        vm.$refs.tree.shiftUpDown('up');
    },
    async shiftDown() {
        vm.$refs.tree.shiftUpDown('down');
    },
};

export const messages = {

    /**
     * asset db 准备就绪
     * 刷新数据
     */
    'asset-db:ready'() {
        vm.ready = true;
        vm.refresh();
    },

    /**
     * asset db 关闭
     * 打开 loading 状态，并隐藏资源树
     */
    'asset-db:close'() {
        vm.clear();
        vm.ready = false;
    },

    /**
     * 选中了某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    'selection:select'(type: string, uuid: string) {
        if (type !== 'asset' || !vm.ready) {
            return;
        }
        vm.select(uuid);
    },

    /**
     * 取消选中了某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    'selection:unselect'(type: string, uuid: string) {
        if (type !== 'asset' || !vm.ready) {
            return;
        }
        vm.unselect(uuid);
    },

    /**
     * asset db 广播通知添加了 asset
     * 在显示的资源树上添加上这个资源
     * @param uuid 选中物体的 uuid
     */
    async 'asset-db:asset-add'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }
        vm.add(uuid);
    },

    /**
     * asset db 广播通知删除了 asset
     * 在显示的资源树上删除这个资源
     * @param uuid 选中物体的 uuid
     */
    async 'asset-db:asset-delete'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }

        vm.delete(uuid);
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    vm = new Vue({
        el: panel.$.content,
        components: {
            tree: require('./components/tree'),
        },
        data: {
            ready: false,
            state: '',
            allExpand: false,
            current: null, // 选中项
            viewHeight: 0, // 当前树形的可视区域高度
            treeHeight: 0, // 完整树形的全部高度
            dirBox: [], // 拖动时高亮的目录区域位置 [top, height]
        },
        mounted() {
            // 组件已准备就绪，与请求数据无关
            this.ready = true;

            // 初始化搜索框
            this.$refs.search.placeholder = Editor.I18n.t('assets.menu.searchPlaceholder');
            this.$refs.search.addEventListener('change', (event: Event) => {
                // @ts-ignore
                const value = event.target.value.trim();
                vm.$refs.tree.search = value;
            });

            // 初始化监听 scroll 事件
            this.$refs.viewBox.addEventListener('scroll', () => {
                vm.$refs.tree.scroll(vm.$refs.viewBox.scrollTop);
            }, false);

            // 下一个 Vue Tick 触发
            this.$nextTick(() => {
                this.resizePanel();
            });
        },
        methods: {
            /**
             * 刷新数据
             */
            async refresh() {
                // 清空原数据
                vm.clear();

                vm.$refs.tree.refresh();
            },
            /**
             * 清空
             */
            clear() {
                vm.$refs.tree.clear();
                vm.$refs.search.value = '';
            },
            /**
             * 全部节点是否展开
             */
            allToggle() {
                vm.allExpand = !vm.allExpand;
                vm.$refs.tree.allToggle();
            },
            /**
             * 添加资源到树形
             * @param uuid
             */
            add(uuid: string) {
                vm.$refs.tree.add(uuid);
            },
            /**
             * 从树形删除资源
             * @param uuid
             */
            delete(uuid: string) {
                vm.$refs.tree.delete(uuid);
            },
            /**
             * ipc select 最近一次返回的项
             */
            select(uuid: string) {
                vm.current = vm.$refs.tree.select(uuid);
            },
            /**
             * ipc unselect 最近一次取消选择
             * 此时 vm.current = {}
             */
            unselect(uuid: string) {
                vm.current = vm.$refs.tree.unselect(uuid);
            },
            /**
             * 创建按钮的弹出菜单
             */
            popupNew(event: Event) {
                Editor.Menu.popup({
                    // @ts-ignore
                    x: event.pageX,
                    // @ts-ignore
                    y: event.pageY,
                    menu: [
                        {
                            label: Editor.I18n.t('assets.menu.newFolder'),
                            click() {
                                vm.$refs.tree.ipcAdd({ type: 'folder' });
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newJavascript'),
                            click() {
                                vm.$refs.tree.ipcAdd({ type: 'javascript' });
                            }
                        },
                    ]
                });
            },
            /**
             * 面板的右击菜单
             * @param event
             * @param item
             */
            popupContextMenu(event: Event) {
                // @ts-ignore
                if (event.button !== 2) {
                    return;
                }

                Editor.Menu.popup({
                    // @ts-ignore
                    x: event.pageX,
                    // @ts-ignore
                    y: event.pageY,
                    menu: [
                        {
                            label: Editor.I18n.t('assets.menu.new'),
                            submenu: [
                                {
                                    label: Editor.I18n.t('assets.menu.newFolder'),
                                    click() {
                                        vm.$refs.tree.ipcAdd({ type: 'folder' });
                                    }
                                },
                                {
                                    type: 'separator'
                                },
                                {
                                    label: Editor.I18n.t('assets.menu.newJavascript'),
                                    click() {
                                        vm.$refs.tree.ipcAdd({ type: 'javascript' });
                                    }
                                },
                            ]
                        },
                    ]
                });
            },
            /**
             * 调整可视区域高度
             */
            resizePanel() {
                vm.$refs.tree.viewHeight = vm.viewHeight = vm.$refs.viewBox.clientHeight;
            },
        },
    });

    // db 就绪状态才需要查询数据
    vm.ready = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
    if (vm.ready) {
        vm.refresh();
    }
}

export async function beforeClose() { }

export async function close() {
    Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
}

export const listeners = {
    resize() { // 监听面板大小变化
        vm.resizePanel();
    },
};
