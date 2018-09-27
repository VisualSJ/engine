'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
import { thumbnail } from './components/thumbnail';

const fileicon = require('./components/fileicon');
const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;
let treeData: ItreeAsset; // 树形结构的数据，含 children
let copyAssetUUID: string[] = []; // 用于存放已复制资源的 uuid
const needToThumbnail = { // 需要生成缩略图的图片资源
    '2d': ['png', 'jpg', 'jpge', 'webp'],
    '3d': ['png', 'jpg', 'jpge', 'webp'],
};
const dbProtocol = 'db://';

/**
 * 考虑到 key 是数字且要直接用于运算，Map 格式的效率会高一些
 * 将所有资源按照 key = position.top 排列，value = ItreeAsset
 */
const positionMap: Map<number, ItreeAsset> = new Map();

const treeNodeHeight: number = 20; // 配置每个资源的高度，需要与css一致

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
     * 刷新显示面板
     */
    async refresh() {
        const initData = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');
        if (initData) { // 容错处理，数据可能为空
            // 数据格式需要转换一下
            // console.log(initData); return;
            treeData = transformData(initData);
            vm.changeTreeData();
        }
    },
    /**
     * 以下是键盘事件
     */
    /**
     * 全选
     */
    async selectAll(event: Event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
        for (const [top, json] of positionMap) {
            Editor.Ipc.sendToPackage('selection', 'select', 'asset', json.uuid);
        }

    },
    /**
     * 焦点面板搜索
     */
    async find() {
        vm.$refs.searchInput.focus();
    },
    /**
     * 复制资源
     */
    async copy() {
        vm.copyAsset();
    },
    /**
     * 粘贴资源
     */
    async paste() {
        vm.pasteAsset();
    },
    /**
     * 删除资源
     */
    async delete() {
        vm.deleteAsset();
    },
    async up() {
        vm.keyboardUpDown('up');
    },
    async down() {
        vm.keyboardUpDown('down');
    },
    async left() {
        vm.keyboardUpDown('left');
    },
    async right() {
        vm.keyboardUpDown('right');
    },
    async shiftUp() {
        vm.keyboardShiftUpDown('up');
    },
    async shiftDown() {
        vm.keyboardShiftUpDown('down');
    },
};

export const messages = {

    /**
     * asset db 准备就绪
     * 去除 loading 状态，并且显示资源树
     */
    'asset-db:ready'() {
        // panel.$.loading.hidden = true;
        vm.ready = true;
        panel.refresh();
    },

    /**
     * asset db 关闭
     * 打开 loading 状态，并隐藏资源树
     */
    'asset-db:close'() {
        // panel.$.loading.hidden = false;
        vm.ready = false;
        vm.list = [];
    },

    /**
     * 选中了某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    'selection:select'(type: string, uuid: string) {
        if (type !== 'asset') {
            return;
        }
        const index = vm.select.indexOf(uuid);
        if (index === -1) {
            vm.select.push(uuid);
            vm.current = getAssetFromPositionMap(uuid);
        }
    },

    /**
     * 取消选中了某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    'selection:unselect'(type: string, uuid: string) {
        if (type !== 'asset') {
            return;
        }
        const index = vm.select.indexOf(uuid);
        if (index !== -1) {
            vm.select.splice(index, 1);
        }
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

        const one = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        const arr = legalData([one]);
        arr.forEach((newNode: ItreeAsset) => {
            const parent = addTreeData(treeData.children, 'pathname', 'parent', newNode);
            parent.isExpand = true;
        });

        // 触发节点数据已变动
        vm.changeTreeData();
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
        // 删除当前数据
        removeTreeData(uuid);

        // 触发节点数据已变动
        vm.changeTreeData();
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    const isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');

    vm = new Vue({
        el: panel.$.content,
        data: {
            ready: isReady,
            expand: false, // 是否全部展开
            select: [],
            current: {}, // 当前选中项
            viewHeight: 0, // 当前树形的可视区域高度
            scrollTop: 0, // 当前树形的滚动数据
            search: '', // 搜索资源名称
            nodes: [], // 当前树形在可视区域的资源数据
            shadowOffset: [], // 拖动时高亮的目录区域位置 [top, height]
            state: ''
        },
        components: {
            tree: require('./components/tree'),
        },
        watch: {
            /**
             * 监听属性 viewHeight
             * 高度变化，刷新树形
             */
            viewHeight() {
                vm.renderTree();
            },
            /**
             * 监听属性 scrollTop
             * 滚动变化，刷新树形
             */
            scrollTop() {
                vm.renderTree();
            },
            /**
             * 监听属性 搜索资源名称
             */
            search() {
                vm.changeTreeData();
            },
        },
        mounted() {

            // 初始化搜索框
            this.$refs.searchInput.placeholder = Editor.I18n.t('assets.menu.searchPlaceholder');
            this.$refs.searchInput.addEventListener('change', (event: Event) => {
                const $target: any = event.target;
                this.search = $target.value.trim();
            });

            // 初始化监听 scroll 事件
            this.$refs.viewBox.addEventListener('scroll', () => {
                vm.scrollTree(vm.$refs.viewBox.scrollTop);
            }, false);

            // 下一个 Vue Tick 触发
            this.$nextTick(() => {
                this.resizeTree();
            });
        },
        methods: {
            /**
             * 刷新数据
             */
            refresh() {
                // 清空原数据
                // @ts-ignore
                treeData = null;

                vm.ready && panel.refresh();
            },
            /**
             * 创建资源
             * @param item
             * @param json
             */
            newAsset(uuid: string, json: IaddAsset) {
                if (uuid === '') {
                    uuid = vm.getFirstSelect();
                }

                newAsset(uuid, json);
            },
            /**
             * 删除资源
             * @param item
             */
            async deleteAsset(uuid: string) {
                if (uuid && !vm.select.includes(uuid)) { // 如果该资源没有被选中
                    Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
                    Editor.Ipc.sendToPackage('asset-db', 'delete-asset', uuid);
                } else { // 删除所有选中项
                    const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
                    uuids.forEach((uuid: string) => {
                        Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
                        Editor.Ipc.sendToPackage('asset-db', 'delete-asset', uuid);
                    });
                }

            },
            /**
             * 资源的折叠切换
             * @param uuid
             */
            toggleAsset(uuid: string, value: boolean) {
                const one = getAssetFromTreeData(treeData, uuid)[0]; // 获取该资源的数据，包含子资源

                if (one && one.isParent) {
                    one.isExpand = value !== undefined ? value : !one.isExpand;

                    vm.changeTreeData();
                }
            },
            /**
             * 上下左右 按键
             * backspace 和 enter 按键
             * @param direction
             * @param shiftKey
             */
            keyboardUpDown(direction: string) {
                const uuid = vm.getFirstSelect();
                if (direction === 'right') {
                    vm.toggleAsset(uuid, true);
                } else if (direction === 'left') {
                    vm.toggleAsset(uuid, false);
                } else {
                    const siblings = getSiblingsFromPositionMap(uuid);
                    let current;
                    switch (direction) {
                        case 'up':
                            current = siblings[1];
                            break;
                        case 'down':
                            current = siblings[2];
                            break;
                    }

                    if (current) {
                        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                        Editor.Ipc.sendToPackage('selection', 'select', 'asset', current.uuid);
                    }
                }
            },
            /**
             * 按住 shift 键，同时上下选择
             */
            async keyboardShiftUpDown(direction: string) {
                // 同时按住了 shift 键
                const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
                if (uuids && uuids.length === 0) {
                    return;
                }
                const length = uuids.length;
                const last = uuids[length - 1];

                const siblings = getSiblingsFromPositionMap(last);
                let current;
                switch (direction) {
                    case 'up':
                        current = siblings[1];
                        break;
                    case 'down':
                        current = siblings[2];
                        break;
                }
                if (current) {
                    vm.multipleSelect(current.uuid);
                }
            },
            /**
             * 折叠或展开面板
             */
            toggleAll() {
                vm.expand = !vm.expand;

                resetAssetProperty(treeData, { isExpand: vm.expand });

                vm.changeTreeData();
            },
            /**
             * 节点多选
             */
            async multipleSelect(uuid: string | string[]) {
                if (Array.isArray(uuid)) {
                    Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                    Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
                    return;
                }
                const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
                if (uuids.length === 0) {
                    return;
                }
                const one = getAssetFromPositionMap(uuid); // 当前给定的元素
                const first = getAssetFromPositionMap(uuids[0]); // 已选列表中的第一个元素
                if (one !== undefined && first !== undefined) {
                    const select: string[] = [];
                    const min = one.top < first.top ? one.top : first.top;
                    const max = min === one.top ? first.top : one.top;
                    for (const [top, json] of positionMap) {
                        if (min <= top && top <= max) {
                            select.push(json.uuid);
                        }
                    }
                    select.splice(select.findIndex((id) => id === first.uuid), 1);
                    select.unshift(first.uuid);
                    select.splice(select.findIndex((id) => id === one.uuid), 1);
                    select.push(one.uuid);

                    Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                    Editor.Ipc.sendToPackage('selection', 'select', 'asset', select);
                }
            },
            /**
             * 修改资源属性
             * 这是异步的，只做发送
             * 获取在另外ipc 'assets-db:node-changed' 处理数据替换和刷新视图
             * @param item
             * @param name
             */
            renameAsset(item: ItreeAsset, name = '') {

                const one = getAssetFromTreeData(treeData, item.uuid)[0]; // 获取该资源的数据

                if (!one || name === '') {
                    // name存在才能重名命，否则还原状态
                    item.state = '';
                    return;
                }

                // 重名命资源
                Editor.Ipc.sendToPackage('asset-db', 'rename-asset', item.uuid, name);

                item.state = 'loading'; // 显示 loading 效果
            },
            /**
             * 拖动中感知当前所处的文件夹，高亮此文件夹
             */
            overAsset(uuid: string) {
                // @ts-ignore
                let node: ItreeAsset = getAssetFromPositionMap(uuid);
                if (!node.isDirectory) {
                    // @ts-ignore
                    node = getAssetFromPositionMap(node.parent);
                    node.state = 'over';
                }

                // @ts-ignore
                this.shadowOffset = [node.top + 4, node.height > treeNodeHeight ? (node.height + 3) : node.height];
            },
            /**
             * 拖动中感知当前所处的文件夹，离开后取消高亮
             */
            leaveAsset(uuid: string) {
                // @ts-ignore
                let node: ItreeAsset = getAssetFromPositionMap(uuid);
                if (!node.isDirectory) {
                    // @ts-ignore
                    node = getAssetFromPositionMap(node.parent);
                }

                // @ts-ignore
                this.shadowOffset = [0, 0];
                node.state = '';
            },
            /**
             * 资源拖动
             *
             * @param json
             */
            dropAsset(item: ItreeAsset, json: IdragAsset) {
                if (json.insert !== 'inside') {
                    return false; // 不是拖动的话，取消
                }

                const toData = getAssetFromTreeData(treeData, json.to); // 将被注入数据的对象

                let target: ItreeAsset;

                // @ts-ignore
                const toNode: ItreeAsset = getAssetFromPositionMap(toData[0].uuid);

                if (toNode.isDirectory) {
                    target = toNode;
                } else {
                    // @ts-ignore
                    target = getAssetFromPositionMap(toData[3].uuid); // 树形节点的父级
                }

                if (json.from === 'osFile') { // 从外部拖文件进来
                    // TODO 面板需要有等待的遮罩效果
                    // console.log(json);
                    // @ts-ignore
                    json.files.forEach((one) => {
                        importAsset(target.uuid, one.path);
                    });
                    return;
                } else { // 常规内部节点拖拽
                    const fromData = getAssetFromTreeData(treeData, json.from);

                    if (target.uuid === fromData[3].uuid) {
                        return false; // 资源移动仍在原来的目录内，不需要移动
                    }

                    // 移动资源
                    Editor.Ipc.sendToPackage('asset-db', 'move-asset', json.from, target.uuid);

                    if (target) {
                        target.state = 'loading'; // 显示 loading 效果
                    }
                }
            },
            /**
             * 复制资源
             * @param uuid
             */
            copyAsset(uuid: string) {
                copyAssetUUID = vm.select.slice();
                if (uuid !== undefined && !vm.select.includes(uuid)) { // 来自右击菜单的单个选中
                    copyAssetUUID = [uuid];
                }
            },
            pasteAsset(uuid: string) {
                if (!uuid) {
                    uuid = vm.getFirstSelect();
                }
                copyAssetUUID.forEach((id: string) => {
                    const arr = getAssetFromTreeData(treeData, id);
                    if (arr[0]) {
                        importAsset(uuid, arr[0].source);
                    }
                });
            },
            /**
             * 树形数据已改变
             * 如资源增删改，是较大的变动，需要重新计算各个配套数据
             */
            changeTreeData() {

                positionMap.clear(); // 清空数据

                calcAssetPosition(); // 重算排位

                calcAssetHeight(); // 计算文件夹的高度

                vm.renderTree(); // 重新渲染出树形

                // 重新定位滚动条, +1 是为了离底部一些距离，更美观，也能避免死循环 scroll 事件
                vm.$refs.scrollBar.style.height = (positionMap.size + 1) * treeNodeHeight + 'px';
            },
            /**
             * 重新渲染树形
             * nodes 存放被渲染的资源数据
             * 主要通过 nodes 数据的变动
             */
            renderTree() {

                vm.nodes = []; // 先清空，这种赋值机制才能刷新vue，而 .length = 0 不行

                // const min = vm.scrollTop - treeNodeHeight / 2; // 算出可视区域的 top 最小值
                const min = vm.scrollTop - treeNodeHeight; // 算出可视区域的 top 最小值
                const max = vm.viewHeight + vm.scrollTop; // 最大值

                for (const [top, json] of positionMap) {
                    if (top >= min && top <= max) { // 在可视区域才显示
                        vm.nodes.push(json);
                    }
                }
            },
            /**
             * dock-layout resize 事件被触发了
             * 即可视区域的高度有调整
             * viewHeight 已被监听，所以视图也会跟着变化
             */
            resizeTree() {
                vm.viewHeight = vm.$refs.viewBox.clientHeight;
            },
            /**
             * 滚动了多少，调整滚动条位置
             * @param scrollTop
             */
            scrollTree(scrollTop = 0) {
                const mode = scrollTop % treeNodeHeight;
                let top = scrollTop - mode;
                if (mode === 0 && scrollTop !== 0) {
                    top -= treeNodeHeight;
                }
                vm.$refs.tree.$el.style.top = `${top}px`; // 模拟出样式

                vm.scrollTop = scrollTop; // 新的滚动值
            },
            /**
             * 创建按钮的弹出菜单
             */
            menuPopupNew(event: Event) {
                Editor.Menu.popup({
                    // @ts-ignore
                    x: event.pageX,
                    // @ts-ignore
                    y: event.pageY,
                    menu: [
                        {
                            label: Editor.I18n.t('assets.menu.newFolder'),
                            click() {
                                vm.newAsset('', { type: 'folder' });
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newJavascript'),
                            click() {
                                vm.newAsset('', { type: 'javascript' });
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
            contextMenuPopup(event: Event) {
                // @ts-ignore
                if (event.button !== 2) {
                    return;
                }

                const self = this;

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
                                        // @ts-ignore
                                        vm.newAsset('', { type: 'folder' });
                                    }
                                },
                                {
                                    type: 'separator'
                                },
                                {
                                    label: Editor.I18n.t('assets.menu.newJavascript'),
                                    click() {
                                        // @ts-ignore
                                        vm.newAsset('', { type: 'javascript' });
                                    }
                                },
                            ]
                        },
                    ]
                });
            },
            /**
             * 以下是工具函数：
             */
            getFirstSelect() { // 获取第一个选中节点，没有选中项，返回根节点
                if (!vm.select[0]) {
                    return treeData.children[0].uuid; // asset 节点资源
                }
                return vm.select[0]; // 当前选中的资源
            }
        },
    });

    // db 就绪状态才需要查询数据
    isReady && panel.refresh();
}

export async function beforeClose() { }

export async function close() {
    Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
}

export const listeners = {
    resize() {
        // 临时监听窗口的变化
        vm.resizeTree();
    },
};

/**
 * 计算所有树形资源的位置数据，这一结果用来做快速检索
 * 重点是设置 positionMap 数据
 * 返回当前序号
 * @param obj
 * @param index 资源的序号
 * @param depth 资源的层级
 */
function calcAssetPosition(obj = treeData, index = 0, depth = 0) {
    const tree = obj.children;
    tree.forEach((json) => {
        const start = index * treeNodeHeight;  // 起始位置
        const one = {
            pathname: json.pathname,
            name: json.name,
            filename: json.filename,
            fileext: json.fileext,
            source: json.source,
            icon: fileicon[json.fileext] || 'i-file',
            thumbnail: json.thumbnail,
            uuid: json.uuid,
            children: json.children,
            top: start,
            _height: treeNodeHeight,
            get height() {
                return this._height;
            },
            set height(add) {
                if (add) {
                    this._height += treeNodeHeight;

                    // 触发其父级高度也增加
                    for (const [top, json] of positionMap) {
                        if (json.uuid === this.parent) {
                            json.height = 1; // 大于 0 就可以，实际计算在内部的setter
                        }
                    }
                } else {
                    this._height = treeNodeHeight;
                }
            },
            parent: json.parent,
            depth: 1, // 第二层，默认给搜索状态下赋值
            isDirectory: json.isDirectory || false,
            isParent: json.isParent,
            isExpand: true,
            state: '',
        };

        if (vm.search === '') { // 没有搜索，不存在数据过滤的情况
            vm.state = '';
            positionMap.set(start, Object.assign(one, { // 平级保存
                depth,
                isExpand: json.isExpand ? true : false,
            }));

            index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

            if (json.children && json.isExpand === true) {
                index = calcAssetPosition(json, index, depth + 1); // depth 是该资源的层级
            }
        } else { // 有搜索
            vm.state = 'search';

            // @ts-ignore
            if (!['root'].includes(json.parent) && json.name.search(vm.search) !== -1) { // 平级保存
                positionMap.set(start, one);
                index++; // index 是平级的编号，即使在 children 中也会被按顺序计算
            }

            if (json.children) {
                index = calcAssetPosition(json, index, 0);
            }
        }
    });
    // 返回序号
    return index;
}

/**
 * 计算一个文件夹的完整高度
 */
function calcAssetHeight() {
    for (const [top, json] of positionMap) {
        json.height = 0;
    }

    for (const [top, json] of positionMap) {
        for (const [t, j] of positionMap) {
            if (j.uuid === json.parent) {
                j.height = 1; // 大于 0 就可以，实际计算在内部的 setter 函数
            }
        }
    }
}

/**
 * 重置某些属性，比如全部折叠或全部展开
 * @param obj
 * @param props
 */
function resetAssetProperty(obj: ItreeAsset, props: any) {
    const tree = obj.children;
    tree.forEach((json: any) => {
        for (const k of Object.keys(props)) {
            json[k] = props[k];
        }

        if (json.children) {
            resetAssetProperty(json, props);
        }
    });
}

/**
 * 获取节点对象 node,
 * 对象所在数组索引 index，
 * 所在数组 array，
 * 所在数组其所在的对象 object
 * 返回 [node, index, array, object]
 *
 * @param arr
 * @param uuid
 */
function getAssetFromTreeData(obj: ItreeAsset, value: string = '', key: string = 'uuid'): any {
    let rt = [];

    if (!obj) {
        return [];
    }
    // @ts-ignore
    if (obj[key] === value) {
        return [obj]; // 根资源比较特殊
    }

    let arr = obj.children;
    if (Array.isArray(obj)) {
        arr = obj;
    }
    for (let i = 0, ii = arr.length; i < ii; i++) {
        const one = arr[i];
        // @ts-ignore
        if (one[key] === value) { // 全等匹配
            return [one, i, arr, obj]; // 找到后返回的数据格式
        }

        if (one.children && one.children.length !== 0) { // 如果还有children的继续迭代查找
            rt = getAssetFromTreeData(one, value, key);

            if (rt.length > 0) { // 找到了才返回，找不到，继续循环
                return rt;
            }
        }
    }

    return rt;
}

/**
 * 更快速地找到树形节点
 */
function getAssetFromPositionMap(uuid = '') {
    for (const [top, json] of positionMap) {
        if (uuid === json.uuid) {
            return json;
        }
    }
}

/**
 * 找到当前节点及其前后节点
 * [current, prev, next]
 */
function getSiblingsFromPositionMap(uuid = '') {
    const assets = Array.from(positionMap.values());
    const length = assets.length;
    let current = assets[0];
    let next = assets[1];
    let prev = assets[length - 1];
    let i = 0;

    for (const [top, json] of positionMap) {
        if (uuid === json.uuid) {
            current = json;
            next = assets[i + 1];
            if (i + 1 >= length) {
                next = assets[0];
            }
            prev = assets[i - 1];
            if (i - 1 < 0) {
                prev = assets[length - 1];
            }
            break;
        }
        i++;
    }
    return [current, prev, next];
}

/**
 * 添加资源后，增加树形节点数据
 */
function addTreeData(rt: ItreeAsset[], key: string, parentKey: any, item: any) {
    // 如果现有数据中有相同 pathname 的数据，清除现有数据
    const existOne: any = getAssetFromTreeData(treeData, item.pathname, 'pathname');
    if (existOne.length > 0) {
        if (item.uuid !== '') {
            existOne[0] = Object.assign(existOne[0], item);
        }
        return;
    }

    // 找出父级
    const one = deepFindParent(rt, key, item[parentKey]);
    if (one) {
        if (!Array.isArray(one.children)) {
            one.children = [];
        }

        one.children.push(item);
        one.isParent = true;
        item.parent = one.uuid;

        sortData(one.children, false);
    } else {
        rt.push(item);
    }
    return one;
}

/**
 * 删除资源后，清除对应树形节点数据
 */
function removeTreeData(uuid: string) {
    const nodeData = getAssetFromTreeData(treeData, uuid);
    if (nodeData[2]) {
        nodeData[2].splice(nodeData[1], 1);
    }
}
/**
 * 从一个扁平的数组的转换为含有 children 字段的树形
 * @param arr
 * @param key 唯一标识的字段
 * @param parentKey 父级的字段名称
 */
function toTreeData(arr: any[], key: string, parentKey: string) {

    const tree = loopOne(loopOne(arr, key, parentKey).reverse(), key, parentKey);
    // 重新排序
    sortData(tree);
    return tree;

    function loopOne(arr: any, key: string, parentKey: string) {
        const rt: ItreeAsset[] = [];

        arr.forEach((item: any) => {
            if (!Array.isArray(item.children)) {
                item.children = [];
            }

            addTreeData(rt, key, parentKey, item);
        });

        return rt;
    }
}
/**
 * 找出父级，深度查找对应关系，类似 id === parentId 确定子父关系
 * @param arr
 * @param key
 * @param parentValue
 */
function deepFindParent(arr: any[], key: string, parentValue: any) {
    const one: any = arr.find((a) => {
        return a[key] === parentValue;
    });

    if (one) {
        return one;
    }

    for (let i = 0, ii = arr.length; i < ii; i++) {
        const rt: any = deepFindParent(arr[i].children, key, parentValue);
        if (rt) {
            return rt;
        }
    }

    return;
}

/**
 * 目录文件和文件夹排序
 * @param arr
 * @param loop 是否循环子集排序，默认开启
 */
function sortData(arr: ItreeAsset[], loop = true) {
    // @ts-ignore;
    arr.sort((a: ItreeAsset, b: ItreeAsset) => {
        // 文件夹优先
        if (a.isDirectory === true && !b.isDirectory) {
            return -1;
        } else if (!a.isDirectory && b.isDirectory === true) {
            return 1;
        } else {
            return a.name > b.name;
        }
    });

    if (loop === false) {
        return;
    }
    // 子集也重新排序
    arr.forEach((a: ItreeAsset) => {
        if (a.children) {
            sortData(a.children, loop);
        }
    });
}

/**
 * 初始的请求数据转换为可用的面板树形数据
 * @param arr
 */
function transformData(arr: ItreeAsset[]) {
    return {
        name: 'root',
        filename: 'root',
        fileext: '',
        uuid: 'root',
        children: toTreeData(legalData(arr), 'pathname', 'parent'),
        state: '',
        source: '',
        pathname: '',
        top: 0,
        parent: '',
        isDirectory: true,
        isExpand: true,
    };
}

/**
 * 处理原始数据
 * @param arr
 */
function legalData(arr: ItreeAsset[]) {
    let rt = arr.filter((a) => a.pathname !== '').map((a: ItreeAsset) => {
        const paths: string[] = a.source.replace(dbProtocol, '').split(/\/|\\/).filter((b) => b !== '');
        a.pathname = paths.join('/');

        // 赋予新字段用于子父层级关联
        a.name = paths.pop() || '';
        const [filename, fileext] = a.name.split('.');

        a.filename = filename;
        a.fileext = (fileext || '').toLowerCase();
        a.parent = paths.length === 0 ? 'root' : paths.join('/');
        a.isExpand = a.parent === 'root' ? true : false;
        a.isParent = a.isDirectory ? true : false;
        a.thumbnail = '';

        // 生成缩略图
        // @ts-ignore
        if (needToThumbnail[Editor.Project.type].includes(fileext)) {
            (async (one: ItreeAsset) => {
                one.thumbnail = await thumbnail(one);
                // TODO 这个地方需要优化，减少触发频率
                vm.changeTreeData();
            })(a);
        }

        return a;
    });

    // 确保父级路径存在
    rt.forEach((a: ItreeAsset) => {
        rt = ensureDir(rt, a.parent.split('/'));
    });
    sortData(rt, false);
    return rt;
}

/**
 * 确保树形数据的路径存在
 * 例如 /a/b/c/d.js 需要确保 /a/b/c 都存在
 */
function ensureDir(arr: ItreeAsset[], paths: string[]) {
    const pathname = paths.join('/');

    if (pathname === 'root') {
        return arr;
    }

    const source = dbProtocol + pathname;
    // @ts-ignore
    const one = getAssetFromTreeData(arr, pathname, 'pathname');
    const existOne = getAssetFromTreeData(treeData, pathname, 'pathname');

    if (one.length === 0 && existOne.length === 0) {
        const newOne = {
            name: pathname,
            source,
            pathname,
            uuid: '',
            isDirectory: true,
            files: [],
            importer: 'unknown',
        };
        // @ts-ignore
        arr = arr.concat(legalData([newOne]));
    }

    return arr;
}

/**
 * 面板内的添加操作，按钮或右击菜单
 * @param uuid 创建的位置
 * @param json
 */
function newAsset(uuid: string, json: IaddAsset) {
    // 获取该资源
    const one = getAssetFromTreeData(treeData, uuid);
    let url = one[0].pathname;

    if (one[0].isDirectory !== true) { // 不是目录，指向父级级
        url = one[3].pathname;
    }

    let content;
    switch (json.type) {
        case 'folder': url += '/New Folder'; break;
        case 'javascript': url += '/NewScript.js'; content = ''; break;
    }

    url = 'db://' + join(url);

    Editor.Ipc.sendToPackage('asset-db', 'create-asset', url, content);
}

/**
 * 外部文件系统拖进资源
 * @param uuid 创建的位置
 * @param path 资源路径
 */
function importAsset(uuid: string, path: string) {
    const one = getAssetFromTreeData(treeData, uuid);
    const url = one[0].source;
    Editor.Ipc.sendToPackage('asset-db', 'import-asset', url, path);
}
