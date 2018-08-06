'use strict';

import { join } from 'path';
import { readFileSync } from 'fs';

let panel: any = null;
let vm: any = null;

// 外部传进来的树形菜单总数据，internal格式 { name: '', uuid: '', children: [] } ; children 的内容数据格式一致
interface TreeNode {
    name: string;
    uuid: string;
    children?: Array<TreeNode>;
    depth?: number;
    isParent?: boolean;
    isExpand?: boolean;
}
let treeData: Array<TreeNode> = [];
/*
* 将所有节点按照 key = position.top 排列，value = internal
* 如第二个节点的数据:
* key: 18
* value:  { name: '', uuid: '', children: [] }
* 考虑到key是数字且要直接用于运算，Map格式的效率会高一些 （待测试）
**/
let positionMap: Map<number, TreeNode> = new Map;
// 配置每个节点的高度，需要与css一致
let treeNodeHeight: number = 18;

const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

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
     * 选中了某个物体
     */
    'selection:select'(event: IPCEvent, type: string, uuid: string) {
        if (type !== 'node') {
            return;
        }
        let index = vm.select.indexOf(uuid);
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
        let index = vm.select.indexOf(uuid);
        if (index !== -1) {
            vm.select.splice(index, 1);
        }
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    let isReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');

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
            viewHeight() {
                // 当可视区域高度变化时，刷新树形
                vm.renderTree();
            },
            scrollTop() {
                // 当可视区域有滚动变化时，刷新树形
                vm.renderTree();
            }
        },
        mounted() {
            // 监听容器viewBox的scroll事件
            this.$refs.viewBox.addEventListener('scroll', () => {
                // 传入新的scrollTop值，触发变动
                vm.scrollTree(vm.$refs.viewBox.scrollTop);
            }, false);

        },
        methods: {
            renderTree() {
                // 清空会被渲染的节点数据
                vm.nodes.length = 0;
                // 算出可视区域的top最小值和最大值
                let min = vm.scrollTop - treeNodeHeight / 2;
                let max = vm.viewHeight + vm.scrollTop;
                for (let [top, json] of positionMap) {
                    if (top >= min && top <= max) {
                        // 在可视区域的才能被用于显示
                        vm.nodes.push(json);
                    }
                }
            },
            toggleNode(uuid = '') {
                /*
                * 节点的toggle切换
                * */

                // 获取该节点的数据，包含子节点
                let parent = getOne(treeData, uuid);

                if (parent) {
                    parent.isExpand = !parent.isExpand;
                    vm.changeTreeData();
                }

                function getOne(arr: Array<TreeNode> = [], uuid = ''): any {
                    let rt;

                    for (let i = arr.length; i--;) {
                        let one = arr[i];
                        if (one.uuid === uuid) {
                            // uuid全等匹配
                            return one;
                        };
                        // 如果还有children的继续迭代查找
                        if (one.children && one.children.length != 0) {
                            rt = getOne(one.children, uuid);
                            if (rt) {
                                // 找到了才返回，找不到，继续循环
                                return rt;
                            }
                        }
                    }

                    return rt;
                }

            },
            changeTreeData() {
                // 树形数据已改变，如节点增删改，是较大的变动，需要重新计算各个配套数据
                positionMap.clear(); // 清空数据
                calcTreeNodePosition(); // 重算排位
                vm.renderTree(); // 重新渲染出树形
                vm.$refs.scrollBar.style.height = positionMap.size * treeNodeHeight + 'px'; // 重新定位滚动条
            },
            resizeTree() {
                // 调整可视区域的高度
                vm.viewHeight = vm.$refs.viewBox.clientHeight;
                // 调整滚动条高度
                vm.$refs.tree.$el.style.height = vm.viewHeight + 'px';
            },
            scrollTree(scrollTop = 0) {
                // 滚动了多少，调整滚动条位置
                vm.scrollTop = scrollTop;
                vm.$refs.tree.$el.style.top = scrollTop + 'px';
                // 重新渲染可视区域的树形
                vm.renderTree();
            }
        },
    });

    // 场景就绪状态才需要查询数据
    isReady && panel.refresh();
};

export async function beforeClose() { }

export async function close() { }

window.addEventListener('resize', function () {
    // 临时监听窗口的变化
    vm.resizeTree();
});

/*
* 计算所有树形节点的位置数据，这一结果用来做快速检索
*/
function calcTreeNodePosition(tree = treeData, index = 0, depth = 0) {
    tree.forEach((json) => {
        // 起始位置
        let start = index * treeNodeHeight;
        // 平级保存，没有children
        positionMap.set(start, {
            name: json.name,
            uuid: json.uuid,
            depth: depth,
            isParent: json.children && json.children.length > 0 ? true : false,
            isExpand: json.children && json.isExpand ? true : false,
        });
        // index 是平级的编号，即使在children中也会被按顺序计算
        index++;
        // 
        if (json.children && json.isExpand === true) {
            // depth 是该节点的层级
            index = calcTreeNodePosition(json.children, index, depth + 1);
        }
    });
    return index;
}

