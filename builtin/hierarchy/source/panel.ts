'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

let panel: any = null;

let vm: any = null;

let treeData: ItreeNode; // 树形结构的数据，含 children

let copyNodeUUID: string[] = []; // 用于存放已复制资源的 uuid

/**
 * 考虑到 key 是数字且要直接用于运算，Map 格式的效率会高一些
 * 将所有节点按照 key = position.top 排列，value = ItreeNode
 */
const positionMap: Map<number, ItreeNode> = new Map();

const treeNodeHeight: number = 20; // 配置每个节点的高度，需要与css一致

const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

/**
 * 配置 hierarchy 的 iconfont 图标
 */
export const fonts = [{
    name: 'hierarchy',
    file: 'packages://hierarchy/static/iconfont.woff',
}];

export const $ = {
    content: '.content',
};

export const methods = {

    /**
     * 刷新显示面板
     */
    async refresh() {
        treeData = await Editor.Ipc.requestToPackage('scene', 'query-node-tree');
        if (treeData) {// 容错处理，数据可能为空
            vm.changeTreeData();
        }
    }
};

export const messages = {

    /**
     * 场景准备就绪
     */
    'scene:ready'() {
        vm.ready = true;
        panel.refresh();
    },

    /**
     * 关闭场景
     */
    'scene:close'() {
        vm.ready = false;
    },

    /**
     * 节点被修改
     *
     * @param event
     * @param uuid
     */
    async 'scene:node-changed'(uuid: string) {
        // 获取该节点最新数据
        const dumpData = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
        // console.log('node-changed', dumpData);

        // 更新当前数据
        changeTreeNodeData(uuid, dumpData);

        // 触发节点数据已变动
        vm.changeTreeData();
    },
    /**
     * 创建一个新节点
     * @param uuid 当前选中节点，即新节点的父节点uuid
     */
    async 'scene:node-created'(uuid: string) {
        // 获取该节点最新数据
        const dumpData = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
        // console.log('node-created', dumpData);

        // 更新当前数据
        const newNodeUUID = addTreeNodeData(dumpData);

        // 新节点被选中
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
        Editor.Ipc.sendToPackage('selection', 'select', 'node', newNodeUUID);

        // 触发节点数据已变动
        vm.changeTreeData();
    },
    /**
     * 删除节点
     * @param uuid 要被删除的节点
     */
    async 'scene:node-removed'(uuid: string) {
        // 删除当前数据
        removeTreeNodeData(uuid);

        // 触发节点数据已变动
        vm.changeTreeData();
    },
    /**
     * 选中了某个物体
     */
    'selection:select'(type: string, uuid: string) {
        if (type !== 'node') {
            return;
        }
        const index = vm.select.indexOf(uuid);
        if (index === -1) {
            vm.select.push(uuid);
        }
    },

    /**
     * 取消选中了某个物体
     */
    'selection:unselect'(type: string, uuid: string) {
        if (type !== 'node') {
            return;
        }
        const index = vm.select.indexOf(uuid);
        if (index !== -1) {
            vm.select.splice(index, 1);
        }
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    const isReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');

    vm = new Vue({
        el: panel.$.content,
        data: {
            ready: isReady,
            expand: false,
            select: [],
            viewHeight: 0, // 当前树形的可视区域高度
            scrollTop: 0, // 当前树形的滚动数据
            search: '', // 搜索节点名称
            nodes: [] // 当前树形在可视区域的节点数据
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
             * 监听属性 搜索节点名称
             */
            search() {
                vm.changeTreeData();
            }
        },
        mounted() {

            // 初始化搜索框
            this.$refs.searchInput.placeholder = Editor.I18n.t('hierarchy.menu.searchPlaceholder');
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
                vm.ready && panel.refresh();
            },
            /**
             * 创建节点
             * @param item
             * @param json
             */
            newNode(uuid: string, json: IaddNode) {
                if (uuid === '') {
                    uuid = vm.getFirstSelect();
                }

                if (json.type === 'emptyNode') {
                    Editor.Ipc.sendToPanel('scene', 'create-node', { // 发送创建节点
                        parent: uuid,
                        name: 'New Node',
                    });
                }
            },
            /**
             * 删除节点
             * @param item
             */
            deleteNode(uuid: string) {
                // 如果当前节点已被选中，先取消选择
                if (vm.select.includes(uuid)) {
                    Editor.Ipc.sendToPackage('selection', 'unselect', 'node', uuid);
                }

                Editor.Ipc.sendToPanel('scene', 'remove-node', { // 发送删除节点
                    uuid
                });
            },
            /**
             * 锁定 / 解锁节点
             * @param uuid
             */
            lockNode(uuid: string) {

                const one = getNodeFromTreeData(treeData, uuid)[0]; // 获取该节点的数据，包含子节点

                if (one) {
                    // TODO 这块需要 ipc scene 修改数据
                    one.isLock = !one.isLock;

                    vm.changeTreeData();
                }
            },
            /**
             * 节点的折叠切换
             * @param uuid
             */
            toggleNode(uuid: string) {

                const one = getNodeFromTreeData(treeData, uuid)[0]; // 获取该节点的数据，包含子节点

                if (one) {
                    one.isExpand = !one.isExpand;

                    vm.changeTreeData();
                }
            },
            /**
             * 折叠或展开面板
             */
            toggleAll() {
                vm.expand = !vm.expand;

                resetNodeProperty(treeData, { isExpand: vm.expand });

                vm.changeTreeData();
            },
            /**
             * 节点多选
             */
            async multipleSelect(uuid: string | string[]) {
                if (Array.isArray(uuid)) {
                    Editor.Ipc.sendToPackage('selection', 'clear', 'node');
                    Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
                    return;
                }
                const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'node');
                if (uuids.length === 0) {
                    return;
                }
                const one = getNodeFromPositionMap(uuid); // 当前给定的元素
                const first = getNodeFromPositionMap(uuids[0]); // 已选列表中的第一个元素
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

                    Editor.Ipc.sendToPackage('selection', 'clear', 'node');
                    Editor.Ipc.sendToPackage('selection', 'select', 'node', select);
                }
            },
            /**
             * 修改节点属性
             * 这是异步的，只做发送
             * 获取在另外ipc 'scene:node-changed' 处理数据替换和刷新视图
             * @param item
             * @param name
             */
            renameNode(item: ItreeNode, name = '') {

                const one = getNodeFromTreeData(treeData, item.uuid)[0]; // 获取该节点的数据

                if (!one || name === '') {
                    // name存在才能重名命，否则还原状态
                    item.state = '';
                    return;
                }

                item.state = 'loading'; // 显示 loading 效果

                Editor.Ipc.sendToPackage('scene', 'set-property', { // 发送修改数据
                    uuid: item.uuid,
                    path: 'name',
                    dump: {
                        type: 'string',
                        value: name,
                    },
                });
            },
            /**
             * 节点拖动
             *
             * @param json
             */
            dropNode(item: ItreeNode, json: IdragNode) {

                const fromData = getNodeFromTreeData(treeData, json.from);

                const toData = getNodeFromTreeData(treeData, json.to); // 将被注入数据的对象

                let offset = 0;
                let loadingItem;

                // 内部平级移动
                if (fromData[3].uuid === toData[3].uuid && ['before', 'after'].indexOf(json.insert) !== -1) {
                    // @ts-ignore
                    loadingItem = getNodeFromPositionMap(fromData[3].uuid); // 元素的父级

                    offset = toData[1] - fromData[1]; // 目标索引减去自身索引
                    if (offset < 0 && json.insert === 'after') { // 小于0的偏移默认是排在目标元素之前，如果是 after 要 +1
                        offset += 1;
                    } else if (offset > 0 && json.insert === 'before') { // 大于0的偏移默认是排在目标元素之后，如果是 before 要 -1
                        offset -= 1;
                    }

                    Editor.Ipc.sendToPackage('scene', 'move-array-element', { // 发送修改数据
                        uuid: fromData[3].uuid,  // 被移动的节点的父级 uuid
                        path: '',
                        key: 'children',
                        target: fromData[1], // 被移动的节点所在的索引
                        offset,
                    });
                } else { // 跨级移动

                    if (json.insert === 'inside') { // 丢进元素里面，被放在尾部
                        // @ts-ignore
                        loadingItem = getNodeFromPositionMap(toData[0].uuid); // 元素自身

                        Editor.Ipc.sendToPackage('scene', 'set-property', {
                            uuid: fromData[0].uuid,
                            path: '',
                            key: 'parent',
                            dump: {
                                type: 'entity',
                                value: toData[0].uuid // 被 drop 的元素就是父级
                            }
                        });
                    } else { // 跨级插入
                        // @ts-ignore
                        loadingItem = getNodeFromPositionMap(toData[3].uuid); // 元素的父级

                        Editor.Ipc.sendToPackage('scene', 'set-property', { // 先丢进父级
                            uuid: fromData[0].uuid,
                            path: '',
                            key: 'parent',
                            dump: {
                                type: 'entity',
                                value: toData[3].uuid // 被 drop 的元素的父级
                            }
                        });

                        offset = toData[1] - toData[2].length; // 目标索引减去自身索引
                        if (offset < 0 && json.insert === 'after') { // 小于0的偏移默认是排在目标元素之前，如果是 after 要 +1
                            offset += 1;
                        } else if (offset > 0 && json.insert === 'before') { // 大于0的偏移默认是排在目标元素之后，如果是 before 要 -1
                            offset -= 1;
                        }

                        // 再在父级里平移
                        Editor.Ipc.sendToPackage('scene', 'move-array-element', {
                            uuid: toData[3].uuid,  // 被移动的节点的父级 uuid，此时 scene 接口那边 toData 和 fromData 已同父级
                            path: '',
                            key: 'children',
                            target: toData[2].length,
                            offset,
                        });
                    }

                    if (loadingItem) {
                        loadingItem.state = 'loading'; // 显示 loading 效果
                    }
                }

            },
            /**
             * 复制资源
             * @param uuid
             */
            copyNode(uuid: string) {
                copyNodeUUID = vm.select.slice();
                if (uuid !== undefined && !vm.select.includes(uuid)) { // 来自右击菜单的单个选中
                    copyNodeUUID = [uuid];
                }
            },
            pasteNode(uuid: string) {
                if (!uuid) {
                    uuid = vm.getFirstSelect();
                }
                copyNodeUUID.forEach((id: string) => {
                    const arr = getNodeFromTreeData(treeData, id);
                    if (arr[0]) {
                        Editor.Ipc.sendToPanel('scene', 'create-node', { // 发送创建节点
                            parent: uuid,
                            name: arr[0].name,
                        });
                    }
                });
            },
            /**
             * 树形数据已改变
             * 如节点增删改，是较大的变动，需要重新计算各个配套数据
             */
            changeTreeData() {

                positionMap.clear(); // 清空数据

                calcNodePosition(); // 重算排位

                vm.renderTree(); // 重新渲染出树形

                // 重新定位滚动条, +1 是为了离底部一些距离，更美观，也能避免死循环 scroll 事件
                vm.$refs.scrollBar.style.height = (positionMap.size + 1) * treeNodeHeight + 'px';
            },
            /**
             * 重新渲染树形
             * nodes 存放被渲染的节点数据
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
                            label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
                            click() {
                                vm.newNode('', { type: 'emptyNode' });
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
                            label: Editor.I18n.t('hierarchy.menu.newNode'),
                            submenu: [
                                {
                                    label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
                                    click() {
                                        // @ts-ignore
                                        vm.newNode('', { type: 'emptyNode' });
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
                    return treeData.uuid; // asset 节点资源
                }
                return vm.select[0]; // 当前选中的资源
            }
        },
    });

    // 场景就绪状态才需要查询数据
    isReady && panel.refresh();
}

export async function beforeClose() { }

export async function close() { }

export const listeners = {
    resize() {
        // 临时监听窗口的变化
        vm.resizeTree();
    },
};

/**
 * 计算所有树形节点的位置数据，这一结果用来做快速检索
 * 重点是设置 positionMap 数据
 * 返回当前序号
 * @param obj
 * @param index 节点的序号
 * @param depth 节点的层级
 */
function calcNodePosition(obj = treeData, index = 0, depth = 0) {
    const tree = obj.children;
    tree.forEach((json) => {
        const start = index * treeNodeHeight;  // 起始位置

        if (vm.search === '') { // 没有搜索，不存在数据过滤的情况
            positionMap.set(start, { // 平级保存
                name: json.name,
                uuid: json.uuid,
                children: [],
                top: start,
                isLock: json.isLock ? true : false,
                depth,
                isParent: json.children && json.children.length > 0 ? true : false,
                isExpand: json.children && json.isExpand ? true : false,
                state: ''
            });

            index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

            if (json.children && json.isExpand === true) {
                index = calcNodePosition(json, index, depth + 1); // depth 是该节点的层级
            }
        } else { // 有搜索
            if (json.name.indexOf(vm.search) !== -1) {
                positionMap.set(start, { // 平级保存
                    name: json.name,
                    uuid: json.uuid,
                    children: [],
                    top: start,
                    isLock: json.isLock ? true : false,
                    depth: 0, // 都保持在第一层
                    isParent: false,
                    isExpand: true,
                    state: ''
                });
                index++; // index 是平级的编号，即使在 children 中也会被按顺序计算
            }

            if (json.children) {
                index = calcNodePosition(json, index, 0);
            }
        }

    });
    // 返回序号
    return index;
}

/**
 * 重置某些属性，比如全部折叠或全部展开
 * @param obj
 * @param props
 */
function resetNodeProperty(obj: ItreeNode, props: any) {
    const tree = obj.children;
    tree.forEach((json: any) => {
        for (const k of Object.keys(props)) {
            json[k] = props[k];
        }

        if (json.children) {
            resetNodeProperty(json, props);
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
function getNodeFromTreeData(obj: ItreeNode, value: string = '', key: string = 'uuid'): any {
    let rt = [];

    if (!obj) {
        return [];
    }

    // @ts-ignore
    if (obj[key] === value) {
        return [obj]; // 根节点比较特殊
    }

    let arr = obj.children;
    if (Array.isArray(obj)) {
        arr = obj;
    }
    for (let i = 0, ii = arr.length; i < ii; i++) {
        const one = arr[i];
        // @ts-ignore
        if (one[key] === value) { // 全等匹配
            return [one, i, arr, obj];
        }

        if (one.children && one.children.length !== 0) { // 如果还有children的继续迭代查找
            rt = getNodeFromTreeData(one, value, key);

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
function getNodeFromPositionMap(uuid = '') {
    for (const [top, json] of positionMap) {
        if (uuid === json.uuid) {
            return json;
        }
    }
}

/**
 * 改变现有节点数据
 * @param uuid 现有节点的uuid
 * @param dumpData 新的数据包
 */
function changeTreeNodeData(uuid: string, dumpData: any) {
    // 现有的节点数据
    const nodeData = getNodeFromTreeData(treeData, uuid)[0];

    // 属性是值类型的修改
    ['name'].forEach((key) => {
        if (nodeData[key] !== dumpData[key].value) {
            nodeData[key] = dumpData[key].value;
        }
    });

    // 属性值是对象类型的修改， 如 children
    const childrenKeys: string[] = nodeData.children.map((one: ItreeNode) => one.uuid);
    const newChildren: ItreeNode[] = [];
    dumpData.children.value.forEach((json: any, i: number) => {
        const id: string = json.value;
        const index = childrenKeys.findIndex((uid) => id === uid);
        let one;
        if (index !== -1) { // 平级移动
            one = nodeData.children[index]; // 原来的父级节点有该元素
        } else { // 跨级移动
            const arrInfo = getNodeFromTreeData(treeData, id); // 从全部数据中找出被移动的数据
            one = arrInfo[2].splice(arrInfo[1], 1)[0];
        }
        one.isExpand = false;
        newChildren.push(one);
    });
    nodeData.children = newChildren;
}

/**
 * 添加新的节点数据
 * @param dumpData
 */
function addTreeNodeData(dumpData: any) {
    const uuid = dumpData.uuid.value;

    // 父级节点
    const uuidParent = dumpData.parent.value;
    const parentNode = getNodeFromTreeData(treeData, uuidParent)[0];

    // 数据转换
    const childNode: ItreeNode = {
        name: dumpData.name.value,
        uuid,
        children: dumpData.children.value,
        top: 0,
        isLock: false
    };

    // 添加入父级
    parentNode.children.push(childNode);
    parentNode.isExpand = true;

    return uuid;
}

/**
 * 清除对应节点数据
 */
function removeTreeNodeData(uuid: string) {
    const nodeData = getNodeFromTreeData(treeData, uuid);
    const index = nodeData[1];

    nodeData[2].splice(index, 1);
}

/**
 * 滚动节点到可视范围内
 * @param uuid
 */
function scrollIntoView(uuid: string) {
    // 情况 A ：判断是否已在展开的节点中，
    const one = getNodeFromPositionMap(uuid);
    if (one) { // 如果 A ：存在，
        // 情况 B ：判断是否在可视范围，
        if (
            (vm.scrollTop - treeNodeHeight) < one.top &&
            one.top < (vm.scrollTop + vm.viewHeight - treeNodeHeight)
        ) {
            return; // 如果 B：是，则终止
        } else { // 如果 B：不是，则滚动到可视的居中范围内
            vm.$refs.viewBox.scrollTo(0, (vm.scrollTop + one.top) / 2);
        }
    } else { // 如果 A ：不存在，展开其父级节点，迭代循环展开其祖父级节点，滚动到可视的居中范围内
        expandTreeNode(uuid);
        vm.changeTreeData();
        scrollIntoView(uuid);
    }
}

/**
 * 展开树形节点
 */
function expandTreeNode(uuid: string) {
    const arr = getNodeFromTreeData(treeData, uuid);
    arr[0].isExpand = true;
    if (arr[3] && arr[3].uuid) {
        expandTreeNode(arr[3].uuid);
    }
}
