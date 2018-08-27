'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

let panel: any = null;

let vm: any = null;

let treeData: ItreeNode; // 树形结构的数据，含 children

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
        // 数据格式需要转换一下
        treeData = transformData(initData);
        vm.changeTreeData();
    }
};

export const messages = {

    /**
     * asset db 准备就绪
     * 去除 loading 状态，并且显示节点树
     */
    'asset-db:ready'() {
        panel.$.loading.hidden = true;
        vm.ready = true;
        panel.refresh();
    },

    /**
     * asset db 关闭
     * 打开 loading 状态，并隐藏节点树
     */
    'asset-db:close'() {
        panel.$.loading.hidden = false;
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
     * 在显示的节点树上添加上这个资源
     * @param uuid 选中物体的 uuid
     */
    async 'asset-db:asset-add'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }

        const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        if (
            !vm.list.length || vm.list.some((item: any) => {
                return item.source !== info.source;
            })
        ) {
            vm.list.push(info);
        }
    },

    /**
     * asset db 广播通知删除了 asset
     * 在显示的节点树上删除这个资源
     * @param uuid 选中物体的 uuid
     */
    async 'asset-db:asset-delete'(uuid: string) {
        // 没有初始化的时候，无需处理添加消息
        if (!vm.ready) {
            return;
        }

        vm.list.some((item: any, index: number) => {
            if (item.uuid === uuid) {
                vm.list.splice(index, 1);
                return true;
            }
        });
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
                let $target: any = event.target;
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
             * 创建节点
             * @param item 
             * @param json 
             */
            newNode(uuid: string, json: IaddNode) {
                if (json.type === 'empty') {
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
                    uuid: uuid
                });
            },
            /**
             * 锁定 / 解锁节点
             * @param uuid 
             */
            lockNode(uuid: string) {

                const one = getOne(treeData, uuid)[0]; // 获取该节点的数据，包含子节点

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

                const one = getOne(treeData, uuid)[0]; // 获取该节点的数据，包含子节点

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

                resetItreeNodeProperty(treeData, { isExpand: vm.expand })

                vm.changeTreeData();
            },
            /**
             * 修改节点属性
             * 这是异步的，只做发送
             * 获取在另外ipc 'scene:node-changed' 处理数据替换和刷新视图
             * @param item 
             * @param name 
             */
            renameNode(item: ItreeNode, name = '') {

                const one = getOne(treeData, item.uuid)[0]; // 获取该节点的数据

                if (!one || name === '') {
                    // name存在才能重名命，否则还原状态
                    item.state = '';
                    return;
                }

                item.state = 'loading'; // 显示 loading 效果

                Editor.Ipc.sendToPackage('scene', 'set-property', { // 发送修改数据
                    uuid: item.uuid,
                    path: '',
                    key: 'name',
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

                const fromData = getOne(treeData, json.from);

                const toData = getOne(treeData, json.to); // 将被注入数据的对象

                let offset = 0;
                let loadingItem;

                // 内部平级移动
                if (fromData[3].uuid === toData[3].uuid && ['before', 'after'].indexOf(json.insert) != -1) {
                    // @ts-ignore
                    loadingItem = this.nodes.find(one => one.uuid === fromData[3].uuid); //元素的父级

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
                        offset: offset,
                    });
                } else { // 跨级移动

                    if (json.insert === 'inside') { // 丢进元素里面，被放在尾部
                        // @ts-ignore
                        loadingItem = this.nodes.find(one => one.uuid === toData[0].uuid); // 元素自身

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
                        loadingItem = this.nodes.find(one => one.uuid === toData[3].uuid); //元素的父级

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
                            offset: offset,
                        });
                    }

                    if (loadingItem) {
                        loadingItem.state = 'loading'; // 显示 loading 效果
                    }
                }

            },
            /**
             * 树形数据已改变
             * 如节点增删改，是较大的变动，需要重新计算各个配套数据
             */
            changeTreeData() {

                positionMap.clear(); // 清空数据

                calcItreeNodePosition(); // 重算排位

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

                let mode = scrollTop % treeNodeHeight;
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
                            label: Editor.I18n.t('hierarchy.menu.newNode'),
                            submenu: [
                                {
                                    label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
                                    click() {
                                        // 当前选中的节点
                                        let currentNode = vm.select[0];
                                        if (!currentNode) { // 当前没有选中的节点
                                            currentNode = treeData.uuid; // 根节点
                                        }
                                        vm.newNode(currentNode, { type: 'empty' });
                                    }
                                }
                            ]
                        },
                    ]
                });
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
 * 计算所有树形节点的位置数据，这一结果用来做快速检索
 * 重点是设置 positionMap 数据
 * 返回当前序号
 * @param obj 
 * @param index 节点的序号
 * @param depth 节点的层级
 */
function calcItreeNodePosition(obj = treeData, index = 0, depth = 0) {
    let tree = obj.children;
    tree.forEach((json) => {
        const start = index * treeNodeHeight;  // 起始位置

        if (vm.search === '') { // 没有搜索，不存在数据过滤的情况
            positionMap.set(start, { // 平级保存
                name: json.name,
                uuid: json.uuid,
                children: [],
                depth,
                isParent: json.children && json.children.length > 0 ? true : false,
                isExpand: json.children && json.isExpand ? true : false,
                state: ''
            });

            index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

            if (json.children && json.isExpand === true) {
                index = calcItreeNodePosition(json, index, depth + 1); // depth 是该节点的层级
            }
        } else { // 有搜索
            if (json.name.indexOf(vm.search) !== -1) {
                positionMap.set(start, { // 平级保存
                    name: json.name,
                    uuid: json.uuid,
                    children: [],
                    depth: 0, // 都保持在第一层
                    isParent: false,
                    isExpand: true,
                    state: ''
                });
                index++; // index 是平级的编号，即使在 children 中也会被按顺序计算
            }

            if (json.children) {
                index = calcItreeNodePosition(json, index, 0);
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
function resetItreeNodeProperty(obj: ItreeNode, props: any) {
    let tree = obj.children;
    tree.forEach((json: any) => {
        for (let k in props) {
            json[k] = props[k];
        }

        if (json.children) {
            resetItreeNodeProperty(json, props);
        }
    });
}

/**
 * 这个数据处理，临时使用，很快会被删除
 * 获取 uuid 所在的 itreeNode 对象 node, 
 * 对象所在数组索引 index，
 * 所在数组 array，
 * 所在数组其所在的对象 object
 * 返回 [node, index, array, object]
 * 
 * @param arr 
 * @param uuid 
 */
function getOne(obj: ItreeNode, uuid = ''): any {
    let rt = [];

    if (obj.uuid === uuid) {
        return [obj]; // 根节点比较特殊
    }

    let arr = obj.children;
    for (let i = 0, ii = arr.length; i < ii; i++) {
        let one = arr[i];

        if (one.uuid === uuid) { // uuid全等匹配
            return [one, i, arr, obj];
        }

        if (one.children && one.children.length !== 0) { // 如果还有children的继续迭代查找
            rt = getOne(one, uuid);

            if (rt.length > 0) { // 找到了才返回，找不到，继续循环
                return rt;
            }
        }
    }

    return rt;
}

/**
 * 改变现有节点数据
 * @param uuid 现有节点的uuid
 * @param dumpData 新的数据包
 */
function changeTreeNodeData(uuid: string, dumpData: any) {
    // 现有的节点数据
    const nodeData = getOne(treeData, uuid)[0];

    /**
     *  属性是值类型的修改
     * */
    ['name'].forEach((key) => {
        if (nodeData[key] !== dumpData[key].value) {
            nodeData[key] = dumpData[key].value;
        }
    });

    /**
     *  属性值是对象类型的修改， 如 children
     * */
    let childrenKeys: Array<string> = nodeData.children.map((one: ItreeNode) => one.uuid);
    let newChildren: Array<ItreeNode> = [];
    dumpData.children.value.forEach((json: any, i: number) => {
        let id: string = json.value;
        let index = childrenKeys.findIndex(uid => id === uid);
        let one;
        if (index != -1) { // 平级移动
            one = nodeData.children[index]; // 原来的父级节点有该元素
        } else { // 跨级移动
            let arrInfo = getOne(treeData, id); // 从全部数据中找出被移动的数据
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
    let uuid = dumpData.uuid.value;

    // 父级节点
    let uuidParent = dumpData.parent.value;
    const parentNode = getOne(treeData, uuidParent)[0];

    // 数据转换
    let childNode: ItreeNode = {
        name: dumpData.name.value,
        uuid: uuid,
        children: dumpData.children.value,
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
    let nodeData = getOne(treeData, uuid);
    let index = nodeData[1];

    nodeData[2].splice(index, 1);
}

/**
 * 从一个扁平的数组的转换为含有 children 字段的树形
 * @param arr
 * @param key 唯一标识的字段
 * @param parentKey 父级的字段名称
 */
function toTreeData(arr: Array<any>, key: string, parentKey: any) {

    return loopOne(loopOne(arr, key, parentKey).reverse(), key, parentKey);

    function loopOne(arr: any, key: string, parentKey: any) {
        let rt: Array<ItreeNode> = [];

        arr.forEach((a: any) => {
            if (!Array.isArray(a.children)) {
                a.children = [];
            }

            let one = deepFind(rt, key, a[parentKey]);

            if (one) {
                if (!Array.isArray(one.children)) {
                    one.children = [];
                }
                one.children.push(a);
            } else {
                rt.push(a);
            }
        });

        return rt;
    }

    function deepFind(arr: Array<any>, key: string, parentValue: any) {
        let one: any = arr.find(a => {
            return a[key] === parentValue;
        });

        if (one) {
            return one;
        }

        for (let i in arr) {
            let rt: any = deepFind(arr[i].children, key, parentValue);
            if (rt) {
                return rt;
            }
        }

        return;
    }
}

function transformData(arr: Array<IsourceNode>) {

    let newArr = arr.filter(a => a.source !== '').map((a: IsourceNode) => {
        let paths: Array<string> = a.source.split('\\');

        // 赋予两个新字段用于子父层级关联
        a.name = paths.pop() || '';
        a.parent = paths.join('\\') || '';

        return a;
    });

    return {
        name: 'root',
        uuid: 'root',
        children: toTreeData(newArr, 'source', 'parent')
    };

}