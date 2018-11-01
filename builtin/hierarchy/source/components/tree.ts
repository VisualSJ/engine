'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

let vm: any = null;

const nodeHeight: number = 20; // 配置每个节点的高度，需要与css一致
const iconWidth: number = 18; // 树形节点 icon 的宽度
const padding: number = 4; // 树形头部的间隔，为了保持美观

let timeOutId: any;
/**
 * 考虑到 key 是数字且要直接用于运算，Map 格式的效率会高一些
 * 将所有有展开的节点按照 key = position.top 排列，value = ItreeNode
 * 注意：仅包含有展开显示的节点
 */
const nodesMap: Map<number, ItreeNode> = new Map();

let treeData: any; // 树形结构的数据，含 children

const trash: any = {}; // 回收站，主要用于移动中，异步的先从一个父级删除节点，再添加另一个父级的过程

let copiedNode: string[] = []; // 用于存放已复制节点的 uuid

export const name = 'tree';

export const template = readFileSync(
    join(__dirname, '../../static/template/tree.html'),
    'utf8'
);

export const components = {
    'tree-node': require('./tree-node')
};

export function data() {
    return {
        state: '',
        nodes: [], // 当前树形在可视区域的节点数据
        selects: [], // 已选中项的 uuid
        folds: {}, // 用于记录已展开的节点
        search: '', // 搜索节点名称
        allExpand: true, // 是否全部展开
        current: {}, // 当前选中项
        viewHeight: 0, // 当前树形的可视区域高度
        top: 0, // 当前树形的定位 top
        scrollTop: 0, // 当前树形的滚动数据
        selectBox: false, // 拖动时高亮的目录区域 {top, height} 或者 false 不显示
        newNodeNeedToRename: false // 由于是异步，存在新建，拖拽进新文件，移动节点这三个过程的新建无法区分，所以需要用第三方变量记录该 rename 的时候
    };
}

export const watch = {
    /**
     * viewHeight 变化，刷新树形
     */
    viewHeight() {
        vm.render();
    },
    /**
     * 高亮的目录区域
     */
    selectBox() {
        vm.$parent.selectBox = vm.selectBox;
    },
    /**
     * scrollTop 变化，刷新树形
     */
    scrollTop() {
        vm.render();
    },
    /**
     * 搜索节点名称
     */
    search() {
        vm.changeData();

        if (vm.search === '') { // 重新定位到选中项
            selectsIntoView();
        }
    },
    /**
     * 当前选中项变动
     */
    activeNode() {
        vm.$parent.activeNode = vm.activeNode;
    },
};

export function mounted() {
    // @ts-ignore
    vm = this;

    // @ts-ignore
    this.$el.addEventListener('dragenter', () => {
        clearTimeout(timeOutId);
        timeOutId = setTimeout(() => {
            vm.dragOver('', 'after');
        }, 500);
    });
    // @ts-ignore
    this.$el.addEventListener('drop', (event) => {
        const dragData = event.dataTransfer.getData('dragData');
        let data: IdragNode;
        if (dragData === '') {
            // @ts-ignore
            data = {};
        } else {
            data = JSON.parse(dragData);
        }

        data.to = treeData.uuid; // cc.Scene 根节点
        data.insert = 'inside';
        vm.drop(data);
    });
    // @ts-ignore
    this.$el.addEventListener('click', () => {
        // @ts-ignore
        if (this.state !== '') {
            return;
        }
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
    });
}

export const methods = {
    /**
     * 清空树形
     */
    clear() {
        // @ts-ignore
        treeData = null;
        this.changeData();
    },

    /**
     * 刷新树形
     */
    async refresh() {
        treeData = await Editor.Ipc.requestToPackage('scene', 'query-node-tree');
        // console.log(treeData); return;
        if (!treeData) { // 容错处理，数据可能为空
            return;
        }

        this.changeData();

        vm.$nextTick(() => {
            selectsIntoView();
        });
        // TODO: scene ready 会触发三次
        // console.log(treeData);
    },

    /**
     * 折叠或展开面板
     */
    allToggle() {
        vm.allExpand = !vm.allExpand;

        // 修改所有树形节点的数据
        resetTreeProps({ isExpand: vm.allExpand });

        this.changeData();
    },

    /**
     * 全部选中
     */
    allSelect() {
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
        for (const [top, node] of nodesMap) {
            Editor.Ipc.sendToPackage('selection', 'select', 'node', node.uuid);
        }
    },

    /**
     * 添加选中项
     * @param uuid
     */
    select(uuid: string) {
        if (!vm.selects.includes(uuid)) {
            vm.selects.push(uuid);
            vm.current = getNodeFromMap(uuid);
            return vm.current;
        }
        return;
    },

    /**
     * 选中单节点
     * @param uuid
     */
    ipcSingleSelect(uuid: string) {
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
        Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
    },

    /**
     * 多选
     * 按下 ctrl 或 shift
     * ctrl 支持取消已选中项
     */
    async ipcMultipleSelect(shiftKey: boolean, uuid: string) {
        // @ts-ignore
        if (shiftKey) {
            // 如果之前没有选中节点，则只要选中当前点击的节点
            // @ts-ignore
            if (this.selects.length === 0) {
                this.ipcSingleSelect(uuid);
                return;
            } else {
                if (Array.isArray(uuid)) {
                    Editor.Ipc.sendToPackage('selection', 'clear', 'node');
                    Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
                    return;
                }
                const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'node');
                if (uuids.length === 0) {
                    return;
                }
                const one = getNodeFromMap(uuid); // 当前给定的元素
                const first = getNodeFromMap(uuids[0]); // 已选列表中的第一个元素
                if (one !== undefined && first !== undefined) {
                    const selects: string[] = [];
                    const min = one.top < first.top ? one.top : first.top;
                    const max = min === one.top ? first.top : one.top;
                    for (const [top, json] of nodesMap) {
                        if (min <= top && top <= max) {
                            selects.push(json.uuid);
                        }
                    }
                    selects.splice(selects.findIndex((id) => id === first.uuid), 1);
                    selects.unshift(first.uuid);
                    selects.splice(selects.findIndex((id) => id === one.uuid), 1);
                    selects.push(one.uuid);

                    Editor.Ipc.sendToPackage('selection', 'clear', 'node');
                    Editor.Ipc.sendToPackage('selection', 'select', 'node', selects);
                }
            }
        } else { // event.ctrlKey || event.metaKey
            // @ts-ignore
            if (this.selects.includes(uuid)) {
                Editor.Ipc.sendToPackage('selection', 'unselect', 'node', uuid);
            } else {
                Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
            }
        }
    },

    /**
     * 取消选中项
     * @param uuid
     */
    unselect(uuid: string) {
        const index = vm.selects.indexOf(uuid);

        if (index !== -1) {
            vm.selects.splice(index, 1);
            return;
        }
        return vm.current;
    },

    /**
     * 添加节点到树形，节点已创建，来自 ipc 通知
     * @param node
     * @param json
     */
    async add(uuid: string) {
        // 获取该节点最新数据
        const dumpData = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
        // 更新当前数据
        const newNode = addNodeIntoTree(dumpData);

        // @ts-ignore
        if (this.state === '') {
            // @ts-ignore
            this.$nextTick(() => {
                // @ts-ignore 检查是否需要重名命
                if (this.newNodeNeedToRename && !newNode.invalid) {
                    newNode.state = 'input';
                }
            });
        }
    },

    /**
     * ipc 发起创建节点
     * @param node
     * @param json
     */
    ipcAdd(json: IaddNode, uuid: string) {
        if (!uuid) {
            uuid = this.getFirstSelect();
        }

        let name = 'New Node';
        switch (json.type) {
            default: name = 'New Node'; break;
        }

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');
        // 发送创建节点
        Editor.Ipc.sendToPanel('scene', 'create-node', {
            parent: uuid,
            name,
        });

        // @ts-ignore 新建成功后需要 rename
        this.newNodeNeedToRename = true;
    },

    /**
     * 修改到节点，来自 ipc 通知
     * @param node
     * @param json
     */
    async change(uuid: string) {
        // 获取该节点最新数据
        const newData = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
        // 更新当前数据
        changeNodeData(newData);
    },

    /**
     * 从树形删除节点
     */
    delete(uuid: string) {
        const arr = getGroupFromTree(treeData, uuid);
        if (arr[2]) {
            const nodeInArr = arr[2].splice(arr[1], 1);
            trash[uuid] = nodeInArr[0];
        }

        // 触发节点数据已变动
        this.changeData();
    },

    /**
     * ipc 发起删除节点
     * @param node
     */
    async ipcDelete(uuid: string) {
        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');

        if (uuid && !vm.selects.includes(uuid)) { // 如果该节点没有被选中，则只是删除此单个
            const node = getValidNode(uuid);
            if (!node) { // 删除的节点不可用，不允许删除
                return;
            }

            Editor.Ipc.sendToPackage('selection', 'unselect', 'node', uuid);
            Editor.Ipc.sendToPanel('scene', 'remove-node', { uuid });
        } else { // 如果该节点是被选中了，表明要删除所有选中项
            vm.selects.forEach((uuid: string) => {
                const node = getValidNode(uuid);
                if (node) {
                    Editor.Ipc.sendToPackage('selection', 'unselect', 'node', uuid);
                    Editor.Ipc.sendToPanel('scene', 'remove-node', { uuid });
                }
            });
            // 重置所有选中
            vm.selects = [];
        }
    },

    /**
     * 节点的折叠切换
     * @param uuid
     */
    toggle(uuid: string, value: boolean) {
        const one = getNodeFromMap(uuid); // 获取该节点的数据，包含子节点
        if (one && one.isParent) {
            one.isExpand = value !== undefined ? value : !one.isExpand;

            vm.folds[uuid] = one.isExpand;
            this.changeData();
        }
    },

    /**
     * 上下左右 按键
     * backspace 和 enter 按键
     * @param direction
     * @param shiftKey
     */
    upDownLeftRight(direction: string) {
        const uuid = this.getFirstSelect();
        if (direction === 'right') {
            this.toggle(uuid, true);
        } else if (direction === 'left') {
            this.toggle(uuid, false);
        } else {
            const siblings = getSiblingsFromMap(uuid);
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
                Editor.Ipc.sendToPackage('selection', 'clear', 'node');
                Editor.Ipc.sendToPackage('selection', 'select', 'node', current.uuid);
            }
        }
    },

    /**
     * 按住 shift 键，同时上下选择
     */
    async shiftUpDown(direction: string) {
        // 同时按住了 shift 键
        const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'node');
        if (uuids && uuids.length === 0) {
            return;
        }
        const length = uuids.length;
        const last = uuids[length - 1];

        const siblings = getSiblingsFromMap(last);
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
            this.multipleSelect(current.uuid);
        }
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
        const one = getNodeFromMap(uuid); // 当前给定的元素
        const first = getNodeFromMap(uuids[0]); // 已选列表中的第一个元素
        if (one !== undefined && first !== undefined) {
            const selects: string[] = [];
            const min = one.top < first.top ? one.top : first.top;
            const max = min === one.top ? first.top : one.top;
            for (const [top, json] of nodesMap) {
                if (min <= top && top <= max) {
                    selects.push(json.uuid);
                }
            }
            selects.splice(selects.findIndex((id) => id === first.uuid), 1);
            selects.unshift(first.uuid);
            selects.splice(selects.findIndex((id) => id === one.uuid), 1);
            selects.push(one.uuid);

            Editor.Ipc.sendToPackage('selection', 'clear', 'node');
            Editor.Ipc.sendToPackage('selection', 'select', 'node', selects);
        }
    },

    /**
     * 节点重名命
     * 这是异步的，只做发送
     * @param node
     * @param name
     */
    rename(node: ItreeNode, name = '') {
        // @ts-ignore 还原需要 rename 的状态，手动新增节点的时候会先标注为 true
        this.newNodeNeedToRename = false;

        // 重置状态，避免 blur, click 冲突，导致不能选中节点
        setTimeout(() => {
            // @ts-ignore
            this.state = '';
        }, 500);

        const one = getValidNode(node.uuid); // 获取该节点的数据

        if (!one || name === '' || name === node.name) {
            // name 存在且与之前的不一样才能重名命，否则还原状态
            node.state = '';
            return;
        }

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');
        // 重名命节点
        Editor.Ipc.sendToPackage('scene', 'set-property', { // 发送修改数据
            uuid: node.uuid,
            path: 'name',
            dump: {
                type: 'string',
                value: name,
            },
        });

        node.state = 'loading'; // 显示 loading 效果
    },

    /**
     * 拖动中感知当前所处的文件夹，高亮此文件夹
     */
    dragOver(uuid: string, position: string) {
        clearTimeout(timeOutId);
        // @ts-ignore
        let node: ItreeNode;
        if (uuid === '') {
            // @ts-ignore
            node = {
                // @ts-ignore
                top: this.$el.lastElementChild.offsetTop - padding,
                left: padding
            };
        } else {
            // @ts-ignore
            node = getNodeFromMap(uuid);
        }

        let top = node.top + padding;
        let height = nodeHeight;
        let left = node.left;
        if (node && node.isParent === false) { // 末级节点
            left = node.left + iconWidth - padding;
        }

        switch (position) {
            case 'before':
                height = 3;
                break;
            case 'after':
                height = 3;
                if (node.isParent) {
                    top += node.height;
                } else {
                    top += nodeHeight;
                }
                break;
        }

        // @ts-ignore
        this.selectBox = {
            top: top + 'px',
            height: height + 'px',
            left: left + 'px',
        };

    },

    /**
     * 节点拖动
     *
     * @param json
     */
    drop(json: IdragNode) {
        // @ts-ignore 隐藏高亮框
        this.selectBox = false;

        if (!json.from) {
            return;
        }

        if (json.from === json.to) { // 移动到原节点
            return;
        }

        const [toNode, toIndex, toArr, toParent] = getGroupFromTree(treeData, json.to); // 将被注入数据的对象

        const uuids = json.from.split(',');
        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');

        uuids.forEach((uuid: string) => {
            (async (fromId) => {
                const [fromNode, fromIndex, fromArr, fromParent] = getGroupFromTree(treeData, fromId);

                // 移动的索引变动
                let offset = 0;
                // 受变动的节点
                let affectNode;

                // 内部平级移动
                // @ts-ignore
                if (['before', 'after'].includes(json.insert) && fromParent.uuid === toParent.uuid) {
                    // @ts-ignore
                    affectNode = getNodeFromMap(fromParent.uuid); // 元素的父级

                    offset = toIndex - fromIndex; // 目标索引减去自身索引
                    if (offset < 0 && json.insert === 'after') { // 小于 0 的偏移默认是排在目标元素之前，如果是 after 要 +1
                        offset += 1;
                    } else if (offset > 0 && json.insert === 'before') { // 大于0的偏移默认是排在目标元素之后，如果是 before 要 -1
                        offset -= 1;
                    }

                    if (offset === 0) {
                        return;
                    }

                    Editor.Ipc.sendToPackage('scene', 'move-array-element', { // 发送修改数据
                        uuid: toParent.uuid,  // 被移动的节点的父级 uuid
                        path: 'children',
                        target: fromIndex, // 被移动的节点所在的索引
                        offset,
                    });
                } else { // 跨级移动
                    // 先从原来的父级删除
                    await Editor.Ipc.sendToPackage('scene', 'remove-node', { uuid: fromNode.uuid });

                    // 再开始移动
                    if (json.insert === 'inside') { // 丢进元素里面，被放在尾部
                        // @ts-ignore
                        affectNode = getNodeFromMap(toNode.uuid); // 元素自身
                        Editor.Ipc.sendToPackage('scene', 'set-property', {
                            uuid: fromNode.uuid,
                            path: 'parent',
                            dump: {
                                type: toNode.type,
                                value: toNode.uuid // 被 drop 的元素就是父级
                            }
                        });
                    } else { // 跨级插入 'before', 'after'
                        // @ts-ignore
                        affectNode = getNodeFromMap(toParent); // 元素的父级
                        await Editor.Ipc.sendToPackage('scene', 'set-property', { // 先丢进父级
                            uuid: fromNode.uuid,
                            path: 'parent',
                            dump: {
                                type: toParent.type,
                                value: toParent.uuid // 被 drop 的元素的父级
                            }
                        });

                        offset = toIndex - toArr.length; // 目标索引减去自身索引
                        if (offset < 0 && json.insert === 'after') { // 小于0的偏移默认是排在目标元素之前，如果是 after 要 +1
                            offset += 1;
                        } else if (offset > 0 && json.insert === 'before') { // 大于0的偏移默认是排在目标元素之后，如果是 before 要 -1
                            offset -= 1;
                        }

                        // 在父级里平移
                        await Editor.Ipc.sendToPackage('scene', 'move-array-element', {
                            uuid: toParent.uuid,  // 父级 uuid
                            path: 'children',
                            target: toArr.length,
                            offset,
                        });
                    }

                    if (affectNode) {
                        affectNode.state = 'loading'; // 显示 loading 效果
                    }
                }
            })(uuid);
        });
    },

    /**
     * 锁定 / 解锁节点
     * @param uuid
     */
    lock(uuid: string) {
        const one = getGroupFromTree(treeData, uuid)[0]; // 获取该节点的数据，包含子节点
        if (one) {
            // TODO 是否需要 ipc scene 修改数据
            one.isLock = !one.isLock;
            vm.changeData();
        }
    },

    /**
     * 复制节点
     * @param uuid
     */
    copy(uuid: string) {
        copiedNode = vm.selects.slice();

        // 来自右击菜单的单个选中，右击节点不在已选项目里
        if (uuid !== undefined && !vm.selects.includes(uuid)) {
            copiedNode = [uuid];
        }
    },

    /**
     * 粘贴
     * @param uuid 粘贴到这个节点里面
     */
    paste(uuid: string) {
        if (!uuid) {
            uuid = this.getFirstSelect();
        }

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');

        _forEach(copiedNode, uuid);

        async function _forEach(uuids: string[], parent: string) {
            uuids.forEach((id: string) => {
                const node = getValidNode(id);
                if (node) {
                    // 循环其子集
                    let childrenUuids;
                    if (Array.isArray(node.children)) {
                        childrenUuids = node.children.map((child: ItreeNode) => child.uuid);
                    }

                    (async (parent, uuid) => {
                        const newParent = await Editor.Ipc.requestToPackage('scene', 'create-node', {
                            parent,
                            dump: uuid,
                        });

                        if (childrenUuids && childrenUuids.length > 0) {
                            _forEach(childrenUuids, newParent);
                        }
                    })(parent, node.uuid);
                }
            });
        }
    },

    /**
     * 树形数据已改变
     * 如节点增删改，是较大的变动，需要重新计算各个配套数据
     */
    changeData() {

        nodesMap.clear(); // 清空数据

        calcNodePosition(); // 重算排位

        calcDirectoryHeight(); // 计算文件夹的高度

        this.render(); // 重新渲染出树形

        // 重新定位滚动条, +1 是为了增加离底距离
        vm.$parent.treeHeight = (nodesMap.size + 1) * nodeHeight;
    },

    /**
     * 重新渲染树形
     * nodes 存放被渲染的节点数据
     * 主要通过 nodes 数据的变动
     */
    render() {
        vm.nodes = []; // 先清空，这种赋值机制才能刷新 vue，而 .length = 0 不行

        const min = vm.scrollTop - nodeHeight; // 算出可视区域的 top 最小值
        const max = vm.viewHeight + vm.scrollTop; // 最大值

        for (const [top, json] of nodesMap) {
            if (top >= min && top <= max) { // 在可视区域才显示
                vm.nodes.push(json);
            }
        }
    },

    /**
     * 滚动了多少，调整滚动条位置
     * @param scrollTop
     */
    scroll(scrollTop = 0) {
        const mode = scrollTop % nodeHeight;
        let top = scrollTop - mode;
        if (mode === 0 && scrollTop !== 0) {
            top -= nodeHeight;
        }

        vm.top = top; // 模拟出样式
        vm.scrollTop = scrollTop; // 新的滚动值
    },

    /**
     * 以下是工具函数：
     */
    getFirstSelect() { // 获取第一个选中节点，没有选中项，返回根节点
        if (!vm.selects[0]) {
            return treeData.uuid; // node 节点
        }
        return vm.selects[0]; // 当前选中的节点
    }
};

/**
 * 计算所有树形资源的位置数据，这一结果用来做快速检索
 * 重点是设置 nodesMap 数据
 * 返回当前序号
 * @param obj
 * @param index 资源的序号
 * @param depth 资源的层级
 */
function calcNodePosition(obj = treeData, index = 0, depth = 0) {
    if (!obj || !Array.isArray(obj.children)) {
        return index;
    }

    obj.children.forEach((one: ItreeNode) => {
        if (!one) {
            return;
        }

        const start = index * nodeHeight;  // 起始位置

        // 扩展属性
        one.depth = depth;
        one.top = start;
        one.left = depth * iconWidth + padding;
        one.state = one.state ? one.state : '';
        one.isParent = one.children && one.children.length > 0 ? true : false;
        const isExpand = vm.folds[one.uuid];
        if (isExpand !== undefined) {
            one.isExpand = isExpand;
        } else {
            one.isExpand = one.isParent ? true : false;
        }
        one.parentUuid = obj.uuid;
        one._height = nodeHeight;
        Object.defineProperty(one, 'height', {
            configurable: true,
            enumerable: true,
            get() {
                return this._height;
            },
            set(add) {
                if (add) {
                    this._height += nodeHeight;

                    // 触发其父级高度也增加
                    for (const [top, asset] of nodesMap) {
                        // @ts-ignore
                        if (this.parentUuid === asset.uuid) {
                            asset.height = 1; // 大于 0 就可以，实际计算在内部的setter
                        }
                    }
                } else {
                    this._height = nodeHeight;
                }
            },
        });

        if (vm.search === '') { // 没有搜索
            vm.state = vm.state === 'search' ? '' : vm.state;
            nodesMap.set(start, one);
            index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

            if (one.isParent && one.isExpand === true) { // 没有搜索的时候只需要计算已展开的层级
                // depth 是该节点的层级
                index = calcNodePosition(one, index, depth + 1);
            }
        } else { // 有搜索
            vm.state = 'search';
            // @ts-ignore
            if (!one.invalid && one.name.search(vm.search) !== -1) { // 平级保存
                one.depth = 1; // 平级保存
                nodesMap.set(start, one);
                index++;
            }

            if (one.isParent) { // 有搜索的时候，只要有层级的都要计算
                index = calcNodePosition(one, index, 0);
            }
        }
    });
    // 返回序号
    return index;
}

/**
 * 计算一个文件夹的完整高度
 */
function calcDirectoryHeight() {
    for (const [top, json] of nodesMap) {
        json.height = 0;
    }

    for (const [top, parent] of nodesMap) {
        for (const [t, asset] of nodesMap) {
            if (asset.parentUuid === parent.uuid) {
                asset.height = 1; // 大于 0 就可以，实际计算在内部的 setter 函数
            }
        }
    }
}

/**
 * 重置某些属性，比如全部折叠或全部展开
 * @param obj
 * @param props
 */
function resetTreeProps(props: any, tree: ItreeNode[] = treeData.children) {
    tree.forEach((node: ItreeNode) => {
        for (const k of Object.keys(props)) {
            const uuid = node.uuid;
            // @ts-ignore
            node[k] = props[k];

            // 收集全部展开或折叠
            if (k === 'isExpand') {
                vm.folds[uuid] = node.isExpand;
            }
        }

        if (node.children) {
            resetTreeProps(props, node.children);
        }
    });
}

/**
 * 获取一组节点的位置信息
 * 节点对象 node,
 * 对象所在数组索引 index，
 * 所在数组 array，
 * 所在数组其所在的对象 object
 * 返回 [node, index, array, object]
 *
 * 找不到节点 返回 []
 * @param arr
 * @param uuid
 */
function getGroupFromTree(obj: ItreeNode, value: string = '', key: string = 'uuid'): any {
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
        if (!one) { // 容错处理，在 change 和 add 后，children 存在空值
            continue;
        }
        // @ts-ignore
        if (one[key] === value) { // 全等匹配
            return [one, i, arr, obj]; // 找到后返回的数据格式
        }

        if (one.children && one.children.length !== 0) { // 如果还有 children 的继续迭代查找
            rt = getGroupFromTree(one, value, key);

            if (rt.length > 0) { // 找到了才返回，找不到，继续循环
                return rt;
            }
        }
    }

    return rt;
}

/**
 * 获取一个可操作的资源节点
 * 不可用表现在无右击菜单，不能复制，拖拽，粘贴，新建子文件等操作
 * @param uuid
 */
function getValidNode(uuid: string) {
    let node = getGroupFromTree(treeData, uuid)[0];

    if (!node) {
        if (trash[uuid]) {
            node = trash[uuid];
        }
    }

    if (!node || node.invalid) { // 资源不可用
        return;
    }

    return node;
}

/**
 * 更快速地找到单个资源节点
 */
function getNodeFromMap(uuid = '') {
    for (const [top, node] of nodesMap) {
        if (uuid === node.uuid) {
            return node;
        }
    }
    return;
}

/**
 * 找到当前节点及其前后节点
 * [current, prev, next]
 */
function getSiblingsFromMap(uuid = '') {
    const nodes = Array.from(nodesMap.values());
    const length = nodes.length;
    let current = nodes[0];
    let next = nodes[1];
    let prev = nodes[length - 1];
    let i = 0;

    for (const [top, json] of nodesMap) {
        if (uuid === json.uuid) {
            current = json;
            next = nodes[i + 1];
            if (i + 1 >= length) {
                next = nodes[0];
            }
            prev = nodes[i - 1];
            if (i - 1 < 0) {
                prev = nodes[length - 1];
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
function addNodeIntoTree(dumpData: any) {
    const uuid = dumpData.uuid.value;

    // 数据转换
    // @ts-ignore
    const newNode: ItreeNode = {
        name: dumpData.name.value,
        uuid,
        children: [],
        type: dumpData.__type__,

        invalid: false,
        isLock: false,
        isParent: false,
        isExpand: false,
        top: 0,
        depth: 0,
        state: '',
    };

    // 父级节点
    let parentNode = getGroupFromTree(treeData, dumpData.parent.value.uuid)[0];
    if (!parentNode) {
        parentNode = treeData;
    }
    if (!Array.isArray(parentNode.children)) {
        parentNode.children = [];
    }
    parentNode.children.push(newNode);
    parentNode.isExpand = true;
    // 触发节点数据已变动
    vm.changeData();
    return newNode;
}

/**
 * 改变现有节点数据
 * @param uuid 现有节点的uuid
 * @param newData 新的数据包
 */
function changeNodeData(newData: any) {
    const uuid = newData.uuid.value;
    // 现有的节点数据
    const node = getValidNode(uuid);

    if (!node) {
        console.error('Can not find the node.');
        return;
    }

    // 属性是值类型的修改
    ['name'].forEach((key) => {
        // @ts-ignore
        if (node[key] !== newData[key].value) {
            // @ts-ignore
            node[key] = newData[key].value;
        }
    });

    // 属性值是对象类型的修改， 如 children
    node.children = newData.children.value.map((json: any) => {
        const uuid: string = json.value;
        return getValidNode(uuid);
    });

    // 触发节点数据已变动
    node.state = ''; // 重置掉 loading 效果
    node.isExpand = true; // 变动节点展开其变动内容
    vm.changeData();
    return node;
}

/**
 * 展开选中项并处于视角中
 */
function selectsIntoView() {
    if (vm.selects.length > 0) { // 展开所有选中项
        vm.selects.forEach((id: string) => {
            expandNode(id);
        });
        vm.changeData();
    }

    vm.$nextTick(() => {
        scrollIntoView(vm.getFirstSelect());
    });
}

/**
 * 滚动节点到可视范围内
 * @param uuid
 */
function scrollIntoView(uuid: string) {
    if (!uuid) {
        return;
    }
    // 情况 A ：判断是否已在展开的节点中，
    const one = getNodeFromMap(uuid);
    if (one) { // 如果 A ：存在，
        // 情况 B ：判断是否在可视范围，
        if (
            (vm.scrollTop - nodeHeight) < one.top &&
            one.top < (vm.scrollTop + vm.viewHeight - nodeHeight)
        ) {
            return; // 如果 B：是，则终止
        } else { // 如果 B：不是，则滚动到可视的居中范围内
            const top = one.top - vm.viewHeight / 2;
            vm.$parent.$refs.viewBox.scrollTo(0, top);
        }
    } else { // 如果 A ：不存在，展开其父级节点，迭代循环展开其祖父级节点，滚动到可视的居中范围内
        if (uuid === treeData.uuid) { // 根节点的除外
            return;
        }

        if (expandNode(uuid)) {
            vm.changeData();
            scrollIntoView(uuid);
        }
    }
}

/**
 * 展开树形节点
 */
function expandNode(uuid: string): boolean {
    const [node, index, arr, parent] = getGroupFromTree(treeData, uuid);
    if (!node) {
        return false;
    }
    node.isExpand = true;

    if (parent && parent.uuid) {
        return expandNode(parent.uuid);
    }
    return true;
}
