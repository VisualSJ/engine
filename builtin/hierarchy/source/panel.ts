'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

let panel: any = null;

let vm: any = null;

let treeData: ItreeNode[] = [];

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
            treeData = await Editor.Ipc.requestToPackage('scene', 'query-node-tree');
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
    async 'scene:node-changed'(event: IPCEvent, uuid: string) {
        // 获取该节点最新数据
        let newOne = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);

        // 替换当前数据
        const nodeData = getOne(treeData, uuid)[0];
        nodeData[2].splice(nodeData[1], 1, newOne);

        // 触发节点数据已变动
        vm.changeTreeData();
    },

    /**
     * 选中了某个物体
     */
    'selection:select'(event: IPCEvent, type: string, uuid: string) {
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
    'selection:unselect'(event: IPCEvent, type: string, uuid: string) {
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
                    item.rename = '';
                    return;
                }

                item.rename = 'loading'; // 显示 loading 效果

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
             * dock-layout resize 事件触发了
             * 调整可视区域的高度
             * viewHeight 被监听了，有变化即变化视图
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
            /**
             * 节点拖动
             * 
             * @param json 
             */
            dropNode(json: IdragNode) {

                const fromData = getOne(treeData, json.from); // 将被移动的对象

                const toData = getOne(treeData, json.to); // 将被注入数据的对象

                if (!toData[0].children) {
                    toData[0].children = []; // 容错处理，数据原本没有 children
                }

                const node = fromData[2].splice(fromData[1], 1)[0];
                let index = toData[1];

                if (json.insert === 'inside') {
                    toData[0].children.push(node);
                } else if (json.insert === 'before') {
                    if (index > fromData[1]) {
                        index--;
                    }
                    toData[2].splice(index, 0, node);
                } else if (json.insert === 'after') {
                    toData[2].splice(index + 1, 0, node);
                }

                vm.changeTreeData();
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
 * @param tree 
 * @param index 节点的序号
 * @param depth 节点的层级
 */
function calcItreeNodePosition(tree = treeData, index = 0, depth = 0) {
    tree.forEach((json) => {

        const start = index * treeNodeHeight;  // 起始位置

        positionMap.set(start, { // 平级保存
            name: json.name,
            uuid: json.uuid,
            depth,
            isParent: json.children && json.children.length > 0 ? true : false,
            isExpand: json.children && json.isExpand ? true : false,
            rename: ''
        });

        index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

        if (json.children && json.isExpand === true) {
            index = calcItreeNodePosition(json.children, index, depth + 1); // depth 是该节点的层级
        }
    });
    // 返回序号
    return index;
}

/**
 * 这个数据处理，临时使用，很快会被删除
 * 获取 uuid 所在的 json 对象及 json 所在的数组的索引值，数组本身
 * 返回 [itreeNode, index, array]
 * 
 * @param arr 
 * @param uuid 
 */
function getOne(arr: ItreeNode[] = [], uuid = ''): any {
    let rt = [];

    for (let i = 0, ii = arr.length; i < ii; i++) {

        const one = arr[i];

        if (one.uuid === uuid) { // uuid全等匹配
            return [one, i, arr];
        }

        if (one.children && one.children.length !== 0) { // 如果还有children的继续迭代查找
            rt = getOne(one.children, uuid);

            if (rt) { // 找到了才返回，找不到，继续循环
                return rt;
            }
        }
    }

    return rt;
}
