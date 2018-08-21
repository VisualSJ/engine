'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

let panel: any = null;

let vm: any = null;

let treeData: ItreeNode;

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
        try {
            let initData = await Editor.Ipc.requestToPackage('scene', 'query-node-tree');
            if (!initData.children) {
                treeData = {
                    name: 'root-temp',
                    uuid: 'root-temp',
                    children: initData,
                    isLock: false,
                }
            } else {
                treeData = initData;
            }
            vm.changeTreeData();
        } catch (error) {
            console.warn(error);
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
        let dumpData = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
        console.log(dumpData);

        // 更新当前数据
        changeTreeNodeData(uuid, dumpData);

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
            }
        },
        mounted() {
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
             * 重新渲染树形
             * nodes 存放被渲染的节点数据
             * 主要通过 nodes 数据的变动 
             */
            renderTree() {

                vm.nodes.length = 0; // 先清空

                const min = vm.scrollTop - treeNodeHeight / 2; // 算出可视区域的 top 最小值
                const max = vm.viewHeight + vm.scrollTop; // 最大值

                for (const [top, json] of positionMap) {
                    if (top >= min && top <= max) { // 在可视区域才显示
                        vm.nodes.push(json);
                    }
                }
            },
            /**
             * 锁定 / 解锁节点
             * @param uuid 
             */
            lockNode(uuid = '') {

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
            toggleNode(uuid = '') {

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

                vm.scrollTop = scrollTop; // 新的滚动值

                vm.$refs.tree.$el.style.top = scrollTop + 'px'; // 模拟出样式

                vm.renderTree();
            },
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
function calcItreeNodePosition(obj = treeData, index = 0, depth = 0) {
    let tree = obj.children;
    tree.forEach((json) => {
        const start = index * treeNodeHeight;  // 起始位置

        positionMap.set(start, { // 平级保存
            name: json.name,
            uuid: json.uuid,
            children: [],
            isLock: json.isLock ? true : false,
            depth,
            isParent: json.children && json.children.length > 0 ? true : false,
            isExpand: json.children && json.isExpand ? true : false,
            state: ''
        });

        index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

        if (json.children && json.isExpand === true) {
            index = calcItreeNodePosition(json, index, depth + 1); // depth 是该节点的层级
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

function changeTreeNodeData(uuid: string, dumpData: any) {
    // 现有的节点数据
    const nodeData = getOne(treeData, uuid)[0];

    // 属性是值类型的修改
    ['name'].forEach((key) => {
        if (nodeData[key] !== dumpData[key].value) {
            nodeData[key] = dumpData[key].value;
        }
    });

    // 属性值是对象类型的修改
    // children
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


