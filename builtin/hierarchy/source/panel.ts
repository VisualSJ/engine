'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');
const db = require('./components/panel-db');
const context = require('./components/panel-context');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

/**
 * 配置 hierarchy 的 iconfont 图标
 */
export const fonts = [{
    name: 'hierarchy',
    file: 'packages://hierarchy/static/font.woff',
}];

export const $ = {
    content: '.hierarchy',
};

export const methods = {
    /**
     * 暂存页面数据
     */
    async staging() {
        Editor.Ipc.sendToPackage('hierarchy', 'staging-fold', JSON.stringify(vm.$refs.tree.folds));
    },

    /**
     * 恢复页面数据
     */
    async unstaging() {
        // 初始化缓存的折叠数据
        const folds = await Editor.Ipc.requestToPackage('hierarchy', 'query-staging-fold');
        vm.$refs.tree.folds = JSON.parse(folds);
    },
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
     * 场景准备就绪
     */
    'scene:ready'() {
        clearTimeout(panel.timer);
        panel.timer = setTimeout(async () => {
            await panel.unstaging();
            requestAnimationFrame(() => {
                vm.refresh();
            });
        }, 300);
    },

    /**
     * 关闭场景
     * 打开 loading 状态
     */
    'scene:close'() {
        panel.staging();
        vm.clear();
    },

    /**
     * 节点被修改
     * @param uuid
     */
    async 'scene:node-changed'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }
        vm.change(uuid);
    },

    /**
     * 创建一个新节点
     * @param uuid
     */
    async 'scene:node-created'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }
        vm.add(uuid);
    },

    /**
     * 删除节点
     * @param uuid 要被删除的节点
     */
    async 'scene:node-removed'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }
        vm.delete(uuid);
    },

    /**
     * 选中了某个物体
     */
    'selection:select'(type: string, uuid: string) {
        if (type !== 'node' || !vm.ready) {
            return;
        }
        vm.select(uuid);
    },

    /**
     * 取消选中了某个物体
     */
    'selection:unselect'(type: string, uuid: string) {
        if (type !== 'node' || !vm.ready) {
            return;
        }
        vm.unselect(uuid);
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    db.vm = vm = new Vue({
        el: panel.$.content,
        components: {
            tree: require('./components/tree'),
        },
        data: {
            language: 'default',
            ready: false,
            state: '',
            allExpand: true,
            current: null, // 选中项
            viewHeight: 0, // 当前树形的可视区域高度
            treeHeight: 0, // 完整树形的全部高度
            selectBox: false, // 随组件 tree 中属性 selectBox 值
        },
        watch: {
            treeHeight() {
                if (vm.treeHeight < vm.viewHeight) {
                    vm.$refs.tree.scroll(0);
                }
            }
        },
        mounted() {
            // 初始化搜索框
            this.$refs.search.placeholder = Editor.I18n.t('hierarchy.menu.searchPlaceholder');
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
             * 翻译
             * @param {*} language
             * @param {*} key
             */
            t(key: string, language: string) {
                return Editor.I18n.t(`hierarchy.${key}`);
            },
            /**
             * 刷新数据
             */
            async refresh() {
                // 清空原数据
                vm.clear();
                await vm.$refs.tree.refresh();
                vm.ready = true;
            },
            /**
             * 清空
             */
            clear() {
                vm.$refs.tree.clear();
                vm.ready = false;
            },
            /**
             * 全部节点是否展开
             */
            allToggle() {
                vm.allExpand = !vm.allExpand;
                vm.$refs.tree.allToggle();
            },
            /**
             * ipc 消息后：添加节点到树形
             * @param uuid
             */
            add(uuid: string) {
                vm.$refs.tree.add(uuid);
            },
            /**
             * ipc 消息后：修改到节点
             * @param uuid
             */
            change(uuid: string) {
                vm.$refs.tree.change(uuid);
            },
            /**
             * ipc 消息后：将节点从树形上删除
             * @param uuid
             */
            delete(uuid: string) {
                vm.$refs.tree.delete(uuid);
            },
            /**
             * ipc 消息后：选中节点，并返回的该选中项
             */
            select(uuid: string) {
                vm.current = vm.$refs.tree.select(uuid, true);
            },
            /**
             * ipc 消息后：取消选中项
             * 此时 vm.current = {}
             */
            unselect(uuid: string) {
                vm.current = vm.$refs.tree.unselect(uuid);
            },
            /**
             * 创建按钮的弹出菜单
             */
            popupNew(event: Event) {
                context.popupNew(event);
            },
            /**
             * 面板的右击菜单
             * @param event
             * @param item
             */
            popupContext(event: Event) {
                // @ts-ignore
                if (event.button !== 2) {
                    return;
                }

                context.popupContext(event);
            },
            /**
             * 调整可视区域高度
             */
            resizePanel() {
                vm.$refs.tree.viewHeight = vm.viewHeight = vm.$refs.viewBox.clientHeight;
            },
        },
    });

    // 场景就绪状态才需要查询数据
    const isReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');

    if (isReady) {
        vm.refresh();
    }
}

export async function beforeClose() { }

export async function close() {
    panel.staging();
    Editor.Ipc.sendToPackage('selection', 'clear', 'node');

}

export const listeners = {
    resize() { // 监听面板大小变化
        vm.resizePanel();
    },
};
