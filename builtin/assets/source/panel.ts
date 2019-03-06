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
 * 配置 assets 的 iconfont 图标
 */
export const fonts = [{
    name: 'assets',
    file: 'packages://assets/static/font.woff',
}];

export const $ = {
    content: '.assets',
};

export const methods = {
    /**
     * 暂存页面数据
     */
    staging() {
        // 节点折叠状态
        const uuidsIsExpand = [];
        for (const uuid in vm.$refs.tree.folds) {
            if (vm.$refs.tree.folds[uuid]) {
                uuidsIsExpand.push(uuid);
            }
        }
        const expand = JSON.stringify(uuidsIsExpand);

        // 排序的方式
        const sort = vm.$refs.tree.sortType;

        // 保存数据
        Editor.Ipc.sendToPackage('assets', 'staging', {expand, sort});
    },

    /**
     * 恢复页面数据
     */
    async unstaging() {
        // 初始化缓存数据
        const {expand, sort} = await Editor.Ipc.requestToPackage('assets', 'query-staging');

        // 节点的折叠
        if (expand === 'false') {
            vm.$refs.tree.firstAllExpand = false;
        } else if (expand === 'true') {
            vm.$refs.tree.firstAllExpand = true;
        } else if (expand) {
            const uuidsIsExpand = JSON.parse(expand);
            uuidsIsExpand.forEach((uuid: string) => {
                vm.$set(vm.$refs.tree.folds, uuid, true);
            });
        }

        // 赋值排序方式
        if (sort) {
            vm.sortType = sort;
        }
    },
    /**
     * 刷新面板
     */
    async refresh() {
        await vm.refresh();
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
     * 复制资源
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
     * asset db 准备就绪
     * 刷新数据
     */
    async 'asset-db:ready'(name: string) {
        await vm.refresh();
    },

    /**
     * asset db 关闭
     * 打开 loading 状态，并隐藏资源树
     * @param name 具体某一个 db 被关闭了
     */
    'asset-db:close'(name: string) {
        vm.clear();
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

    async 'asset-db:asset-change'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }
        vm.delete(uuid);
        vm.add(uuid);
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
            ready: false, // 与 db ready 状态保持一致
            refreshing: false, // 是否正在刷新数据
            state: '',
            language: 'default',
            allExpand: false,
            current: null, // 选中项
            info: '', // 面板底部显示的信息
            viewHeight: 0, // 当前树形的可视区域高度
            viewWidth: 0, // 当前树形的可视区域宽度
            treeHeight: 0, // 完整树形的全部高度
            selectBox: false, // 随组件 tree 中属性 selectBox 值
            searchPlaceholder: 'menu.searchPlaceholder_name', // 指定搜索的类型
            searchType: 'name', // 指定搜索的类型
            sortType: 'name', // 指定排序的类型
        },
        watch: {
            treeHeight() {
                if (vm.treeHeight < vm.viewHeight) {
                    vm.$refs.tree.scroll(0);
                }
            },
            current() {
                if (vm.current) {
                    vm.info = vm.current.source;
                } else {
                    vm.info = '';
                }
            },
            searchType() {
                vm.searchPlaceholder = `menu.searchPlaceholder_${vm.searchType}`;
                vm.$refs.tree.searchType = vm.searchType;
                vm.$refs.tree.doSearch();
            },
            async sortType() {
                vm.$refs.tree.sortType = vm.sortType;
                if (vm.ready) {
                    await vm.refresh();
                }
            },
        },
        mounted() {
            /**
             * 初始化监听 scroll 事件
             * 不放在 vue template 里面是因为有性能损耗，vue 里快速滚动的话会有前后空白区
             * 这样直接绑定性能最好
             */
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
                return Editor.I18n.t(`assets.${key}`, this.language);
            },
            /**
             * 刷新数据
             */
            async refresh() {
                // 清空原数据
                vm.clear();

                await vm.$refs.tree.refresh(true);
                vm.ready = true;
            },
            /**
             * 清空
             */
            clear() {
                vm.ready = false;
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
             * ipc 消息后：添加资源到树形
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
                vm.current = vm.$refs.tree.select(uuid);
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
             * 切换搜索类型
             */
            popupSearchType(event: Event) {
                context.popupSearchType(event);
            },
            /**
             * 切换排序类型
             */
            popupSortType(event: Event) {
                context.popupSortType(event);
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
                vm.viewWidth = panel.clientWidth;
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

    // db 就绪状态才需要查询数据
    const dbReady = await Editor.Ipc.requestToPackage('asset-db', 'query-ready');
    if (dbReady) {
        await vm.refresh();
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
    Editor.Selection.clear('asset');
    Editor.I18n.removeListener('switch', panel.switchLanguage);
}

export const listeners = {
    resize() { // 监听面板大小变化
        vm.resizePanel();
    },
};
