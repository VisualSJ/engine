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
    staging() {
        const uuidsIsExpand = [];
        for (const uuid in vm.$refs.tree.folds) {
            if (vm.$refs.tree.folds[uuid]) {
                uuidsIsExpand.push(uuid);
            }
        }
        const expand = JSON.stringify(uuidsIsExpand);

        Editor.Ipc.sendToPackage('hierarchy', 'staging', { expand });
    },

    /**
     * 恢复页面数据
     */
    async unstaging() {
        // 初始化缓存的折叠数据
        const { expand } = await Editor.Ipc.requestToPackage('hierarchy', 'query-staging');

        if (!expand) {
            vm.$refs.tree.firstAllExpand = false;
        } else if (expand === true) {
            vm.$refs.tree.firstAllExpand = true;
        } else if (expand) {
            const uuidsIsExpand = JSON.parse(expand);
            uuidsIsExpand.forEach((uuid: string) => {
                vm.$set(vm.$refs.tree.folds, uuid, true);
            });
        }
    },
    /**
     * 刷新面板
     */
    refresh() {
        vm.refresh();
    },
    /**
     * 全选
     * 也配置成为了键盘事件，下同
     */
    selectAll(event: Event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        vm.$refs.tree.allSelect();
    },
    /**
     * 焦点面板搜索
     */
    find() {
        vm.$refs.search.focus();
    },
    /**
     * 拷贝节点
     */
    copy() {
        vm.$refs.tree.copy();
    },
    /**
     * 粘贴资源
     */
    paste() {
        vm.$refs.tree.paste();
    },
    /**
     * 复制节点
     */
    duplicate() {
        vm.$refs.tree.duplicate();
    },
    /**
     * 删除资源
     */
    delete() {
        vm.$refs.tree.ipcDelete();
    },
    up() {
        vm.$refs.tree.upDownLeftRight('up');
    },
    down() {
        vm.$refs.tree.upDownLeftRight('down');
    },
    left() {
        vm.$refs.tree.upDownLeftRight('left');
    },
    right() {
        vm.$refs.tree.upDownLeftRight('right');
    },
    shiftUp() {
        vm.$refs.tree.shiftUpDown('up');
    },
    shiftDown() {
        vm.$refs.tree.shiftUpDown('down');
    },
    rename() {
        vm.$refs.tree.keyboardRename();
    },
};

export const messages = {

    /**
     * 场景准备就绪
     */
    async 'scene:ready'() {
        vm.ready = true;
        vm.refresh();
    },

    /**
     * 关闭场景
     * 打开 loading 状态
     */
    'scene:close'() {
        vm.ready = false;
        vm.clear();
    },

    /**
     * 节点被修改
     * @param uuid
     */
    async 'scene:change-node'(uuid: string) {
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
    async 'scene:add-node'(uuid: string) {
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
    async 'scene:remove-node'(uuid: string) {
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

    /**
     * 主动定位到资源
     * 并让其闪烁
     * @param uuid 选中物体的 uuid
     */
    twinkle(uuid: string) {
        vm.twinkle(uuid);
    },

    /**
     * 给编辑器顶层菜单 edit 的复制接口
     */
    copy() {
        panel.copy();
    },

    /**
     * 给编辑器顶层菜单 edit 的粘贴接口
     */
    paste() {
        panel.paste();
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
            ready: false,
            state: '',
            language: 'default',
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
            },
        },
        mounted() {
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
             * @param {*} key
             */
            t(key: string): string {
                // @ts-ignore
                return Editor.I18n.t(`hierarchy.${key}`, this.language);
            },
            /**
             * 刷新数据
             */
            async refresh() {
                // 清空原数据
                vm.clear();

                await vm.$refs.tree.refresh(true);
            },
            /**
             * 清空
             */
            clear() {
                vm.$refs.tree.clear();
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
             * 搜索 input 变动
             */
            searchChange() {
                vm.$refs.tree.search = vm.$refs.search.value;
            },
            /**
             * 搜索时键盘事件
             * 下箭头 切换 选中第一个搜索结果
             */
            searchKeydown(event: Event) {
                // @ts-ignore
                const { keyCode } = event;
                if (keyCode === 40) { // 下箭头
                    // @ts-ignore
                    event.target.blur();
                    vm.$refs.tree.$el.firstChild.click();
                }
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
            /**
             * 主动定位到资源
             * 并让其闪烁
             */
            twinkle(uuid: string) {
                vm.$refs.tree.twinkle(uuid);
            },
        },
    });

    // 初始化缓存的折叠数据
    await panel.unstaging();

    // 场景就绪状态才需要查询数据
    vm.ready = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');

    if (vm.ready) {
        vm.refresh();
    }

    // 订阅 i18n 变动
    panel.switchLanguage = (language: string) => {
        vm.language = language;
    };
    Editor.I18n.on('switch', panel.switchLanguage);
}

export async function beforeClose() { }

export async function close() {
    panel.staging();
    Editor.Selection.clear('node');
    Editor.I18n.removeListener('switch', panel.switchLanguage);
}

export const listeners = {
    resize() { // 监听面板大小变化
        vm.resizePanel();
    },
};
