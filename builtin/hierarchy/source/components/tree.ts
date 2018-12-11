'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const db = require('./tree-db');
const utils = require('./tree-utils');

let vm: any = null;

let copiedUuids: string[] = []; // 用于存放已复制节点的 uuid

export const name = 'tree';

export const template = readFileSync(
    join(__dirname, '../../static/template/tree.html'),
    'utf8'
);

export const components = {
    'tree-node': require('./tree-node'),
};

export function data() {
    return {
        state: '',
        nodes: [], // 当前树形在可视区域的节点数据
        selects: [], // 已选中项的 uuid
        folds: {}, // 用于记录已展开的节点
        firstAllExpand: false, // 根据编辑器的配置来设置第一次的所有节点是否展开
        renameUuid: '', // 需要 rename 的节点的 url，只有一个
        intoView: '', // 定位显示资源，uuid, 只有一个
        search: '', // 搜索节点名称
        allExpand: true, // 是否全部展开
        current: {}, // 当前选中项
        viewHeight: 0, // 当前树形的可视区域高度
        top: 0, // 当前树形的定位 top
        scrollTop: 0, // 当前树形的滚动数据
        selectBox: {}, // 拖动时高亮的目录区域 {top, height}
    };
}

export const watch = {
    /**
     * 定位显示资源
     */
    intoView() {
        // @ts-ignore
        utils.scrollIntoView(vm.intoView);
    },
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
        // 搜索有变动都先滚回顶部
        vm.intoView = '';

        // 重新计算
        vm.changeData();

        // 重新定位到选中项
        vm.$nextTick(() => {
            if (vm.search === '') {
                vm.intoView = vm.getFirstSelect();
            }
        });
    },
    /**
     * 当前选中项变动
     */
    activeNode() {
        vm.$parent.activeNode = vm.activeNode;
    },
    /**
     * 展开全部项
     */
    allExpand() {
        vm.$parent.allExpand = vm.allExpand;
    },
};

export function mounted() {
    // @ts-ignore
    db.vm = vm = this;
}

export const methods = {
    /**
     * 清空树形
     */
    clear() {
        // @ts-ignore
        db.reset();
        this.changeData();
    },

    /**
     * 刷新树形
     */
    async refresh() {
        await db.refresh();
        if (!db.nodesTree) { // 容错处理，数据可能为空
            return;
        }

        this.changeData();

        // @ts-ignore 准备重新定位
        let intoView = this.intoView;
        // @ts-ignore
        this.intoView = '';
        // @ts-ignore
        const renameUuid = this.renameUuid;
        if (renameUuid !== '') {
            const node = utils.getNodeFromTree(renameUuid);
            if (node) {
                intoView = node.uuid;
            }
        }

        // @ts-ignore
        this.intoView = intoView;
    },

    /**
     * 折叠或展开面板
     */
    allToggle() {
        vm.allExpand = !vm.allExpand;

        // 修改所有树形节点的数据
        utils.resetTreeProps({ isExpand: vm.allExpand });

        this.changeData();
    },

    /**
     * 全部选中
     */
    allSelect() {
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
        for (const [top, node] of db.nodesMap) {
            Editor.Ipc.sendToPackage('selection', 'select', 'node', node.uuid);
        }
    },

    /**
     * 添加选中项
     * @param uuid
     * @param show 是否定位显示
     */
    select(uuid: string, show = false) {
        if (!vm.selects.includes(uuid)) {
            vm.selects.push(uuid);
            vm.current = utils.getNodeFromMap(uuid);

            if (show) {
                // @ts-ignore
                this.intoView = uuid;
            }
            return vm.current;
        }
        return;
    },

    /**
     * 选中单节点
     * @param uuid
     */
    ipcSingleSelect(uuid: string) {
        this.ipcResetSelect(uuid);
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
                    this.ipcResetSelect(uuid);
                    return;
                }
                const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'node');
                if (uuids.length === 0) {
                    return;
                }
                const one = utils.getNodeFromMap(uuid); // 当前给定的元素
                const first = utils.getNodeFromMap(uuids[0]); // 已选列表中的第一个元素
                if (one !== undefined && first !== undefined) {
                    const selects: string[] = [];
                    const min = one.top < first.top ? one.top : first.top;
                    const max = min === one.top ? first.top : one.top;
                    for (const [top, json] of db.nodesMap) {
                        if (min <= top && top <= max) {
                            selects.push(json.uuid);
                        }
                    }
                    selects.splice(selects.findIndex((id) => id === first.uuid), 1);
                    selects.unshift(first.uuid);
                    selects.splice(selects.findIndex((id) => id === one.uuid), 1);
                    selects.push(one.uuid);

                    this.ipcResetSelect(selects);
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
     * 重新选中节点
     * @param uuid
     */
    ipcResetSelect(uuid: string | string[]) {
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
        Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
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
        await db.addNode(uuid);

        vm.changeData();
    },

    /**
     * ipc 发起创建节点
     * @param node
     * @param json
     */
    async ipcAdd(json: IaddNode, uuid: string) {
        if (!uuid) {
            uuid = this.getFirstSelect();
        }

        const parent = utils.getNodeFromTree(uuid);
        if (utils.canNotPasteNode(parent)) {
            return;
        }

        let name = 'New Node';
        switch (json.type) {
            default: name = 'New Node'; break;
        }

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');
        // 发送创建节点
        vm.renameUuid = await Editor.Ipc.requestToPackage('scene', 'create-node', {
            parent: uuid,
            name,
        });

        parent.state = '';
    },

    /**
     * 修改到节点，来自 ipc 通知
     * @param node
     * @param json
     */
    async change(uuid: string) {
        await db.changeNode(uuid);

        vm.changeData();
    },

    /**
     * 从树形删除节点
     */
    delete(uuid: string, parentUuid: string) {
        const throwToTrash = (node: ItreeNode) => {
            db.trash[node.uuid] = node;
            if (Array.isArray(node.children)) {
                node.children.forEach((child: ItreeNode) => {
                    throwToTrash(child);
                });
            }
        };

        let arr = utils.getGroupFromTree(db.nodesTree, uuid);
        if (arr.length === 0) { // 现有树形中没有，从回收站再找找
            const node = db.trash[uuid];
            if (node) {
                const parentNode = db.trash[node.parentUuid];
                if (parentNode) {
                    arr = utils.getGroupFromTree(parentNode, uuid);
                }
            }
        }

        if (parentUuid && arr[3]) {
            if (parentUuid !== arr[3].uuid) {
                return; // 指定父级，父级不相等，就不执行下步删除
            }
        }

        if (arr[2]) {
            const nodeInArr = arr[2].splice(arr[1], 1);
            throwToTrash(nodeInArr[0]);
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
            const node = utils.getNodeFromTree(uuid);
            if (!node) { // 删除的节点不可用，不允许删除
                return;
            }

            Editor.Ipc.sendToPackage('selection', 'unselect', 'node', uuid);
            Editor.Ipc.sendToPanel('scene', 'remove-node', { uuid });
        } else { // 如果该节点是被选中了，表明要删除所有选中项
            vm.selects.forEach((uuid: string) => {
                const node = utils.getNodeFromTree(uuid);
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
        const one = utils.getNodeFromMap(uuid); // 获取该节点的数据，包含子节点
        if (one && one.isParent) {
            one.isExpand = value !== undefined ? value : !one.isExpand;

            this.changeData();

            if (one.depth === 0) {
                vm.checkAllToggleStatus();
            }
        }
    },

    /**
     * 小优化，给界面上的 allToggle 按钮准确的切换状态
     */
    checkAllToggleStatus() {
        let allCollapse: boolean = true;
        db.nodesTree.children.forEach((node: ItreeNode) => {
            if (node.isParent && node.isExpand) {
                allCollapse = false;
            }
        });

        vm.allExpand = !allCollapse;
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
            const siblings = utils.getSiblingsFromMap(uuid);
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
                this.ipcResetSelect(current.uuid);
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

        const siblings = utils.getSiblingsFromMap(last);
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
     * 空白处点击，取消选中
     */
    click(event: Event) {
        // @ts-ignore
        if (this.state !== '') {
            return;
        }
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
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
        const one = utils.getNodeFromMap(uuid); // 当前给定的元素
        const first = utils.getNodeFromMap(uuids[0]); // 已选列表中的第一个元素
        if (one !== undefined && first !== undefined) {
            const selects: string[] = [];
            const min = one.top < first.top ? one.top : first.top;
            const max = min === one.top ? first.top : one.top;
            for (const [top, json] of db.nodesMap) {
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
    async rename(node: ItreeNode, name = '') {
        // @ts-ignore 清空需要 rename 的节点
        this.renameUuid = '';

        if (utils.canNotRenameNode(node) || name === '' || name === node.name) {
            // name 存在且与之前的不一样才能重名命，否则还原状态
            node.state = '';
            return;
        }

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');

        // 重名命节点
        const isSuccess = await Editor.Ipc.requestToPackage('scene', 'set-property', { // 发送修改数据
            uuid: node.uuid,
            path: 'name',
            dump: {
                type: 'string',
                value: name,
            },
        });

        if (isSuccess) {
            node.state = 'loading'; // 显示 loading 效果
        } else {
            Editor.Dialog.show({
                type: 'error',
                message: Editor.I18n.t('hierarchy.operate.renameFail'),
            });
            node.state = '';
        }
    },

    /**
     * 拖动且移出本面板时，选框隐藏
     */
    hideSelectBox() {
        clearTimeout(vm.timerDrag);
        vm.timerDrag = setTimeout(() => {
            vm.selectBox = {
                opacity: 0,
            };
        }, 500);
    },

    /**
     * 拖动中感知当前所处的文件夹，高亮此文件夹
     */
    dragOver(uuid: string, position: string) {
        // @ts-ignore
        let node: ItreeNode;
        if (uuid === '') {
            // @ts-ignore
            node = {
                // @ts-ignore
                top: this.$el.lastElementChild.offsetTop - db.padding,
                left: db.padding,
            };
        } else {
            // @ts-ignore
            node = utils.getNodeFromMap(uuid);
        }

        let top = node.top + db.padding;
        let height = db.nodeHeight;
        let left = node.left;
        if (node && node.isParent === false) { // 末级节点
            left = node.left + db.iconWidth - db.padding;
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
                    top += db.nodeHeight;
                }
                break;
        }

        // @ts-ignore
        this.selectBox = {
            opacity: top + '!important',
            top: top + 'px',

            left: left + 'px',
            height: height + 'px',
        };

    },

    /**
     * 进入 tree 容器
     * @param event
     */
    dragEnter(event: Event) {
        vm.dragOver('', 'after');
    },

    /**
     * tree 容器上的 drop
     */
    drop(event: Event) {
        // @ts-ignore
        const dragData = event.dataTransfer.getData('dragData');
        let data: IdragNode;
        if (dragData === '') {
            // @ts-ignore
            data = {};
        } else {
            data = JSON.parse(dragData);
        }

        data.to = db.nodesTree.uuid; // cc.Scene 根节点
        data.insert = 'inside';
        // @ts-ignore
        data.copy = event.ctrlKey;
        vm.ipcDrop(data);
    },

    /**
     * 节点拖动
     *
     * @param json
     */
    async ipcDrop(json: IdragNode) {
        // @ts-ignore 选框立即消失
        this.selectBox = {
            opacity: 0,
        };

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');

        // 明确接受 cc.Prefab 资源作为节点
        if (json.type === 'cc.Prefab') {
            const [toNode, toIndex, toArr, toParent] = utils.getGroupFromTree(db.nodesTree, json.to); // 将被注入数据的对象

            await Editor.Ipc.requestToPanel('scene', 'create-node', {
                parent: json.insert === 'inside' ? toNode.uuid : toParent.uuid,
                assetUuid: json.from,
            });

            if (json.insert === 'inside') {
                return; // 上步已新增完毕
            }

            let offset = toIndex - toArr.length; // 目标索引减去自身索引
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

        } else if (json.type === 'cc.Node') {
            if (!json.from) {
                return;
            }

            if (json.copy) { // 按住了 ctrl 键，拖动复制
                copiedUuids = json.from.split(',');
                vm.paste(json.to);
                return;
            }

            vm.move(json);
        }
    },

    /**
     * 锁定 / 解锁节点
     * @param uuid
     */
    lock(uuid: string) {
        const one = utils.getGroupFromTree(db.nodesTree, uuid)[0]; // 获取该节点的数据，包含子节点
        if (one) {
            // TODO 是否需要 ipc scene 修改数据
            one.isLock = !one.isLock;
            vm.changeData();
        }
    },

    /**
     * 拷贝节点
     * @param uuid
     */
    copy(uuid: string) {
        copiedUuids = vm.selects.slice();

        // 来自右击菜单的单个选中，右击节点不在已选项目里
        if (uuid !== undefined && !vm.selects.includes(uuid)) {
            copiedUuids = [uuid];
        }
    },

    /**
     * 粘贴
     * @param uuid 粘贴到这个节点里面
     */
    async paste(uuid: string) {
        if (!uuid) {
            uuid = this.getFirstSelect();
        }

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');

        const newSelected: string[] = []; // 新的选中项切换为新节点
        let selectedTimer: any; // 重新选中的定时器

        async function _forEach(uuids: string[], parent: string) {
            // 多节点的复制，根据现有排序的顺序执行
            const nodes: any[] = uuids.map((uuid: string) => {
                return utils.getGroupFromTree(db.nodesTree, uuid)[0];
            }).filter(Boolean).sort((a, b) => {
                return a.top - b.top;
            });

            nodes.forEach((node: ItreeNode) => {
                // 循环其子集
                let childrenUuids;
                if (Array.isArray(node.children)) {
                    childrenUuids = node.children.map((child: ItreeNode) => child.uuid);
                }

                (async (parent, uuid) => {
                    const newNodeUuid = await Editor.Ipc.requestToPackage('scene', 'create-node', {
                        parent,
                        dump: uuid,
                    });

                    newSelected.push(newNodeUuid);

                    clearTimeout(selectedTimer);
                    selectedTimer = setTimeout(() => {
                        vm.ipcResetSelect(newSelected);
                    }, 200);

                    if (childrenUuids && childrenUuids.length > 0) {
                        await _forEach(childrenUuids, newNodeUuid);
                    }
                })(parent, node.uuid);
            });
        }
        await _forEach(copiedUuids, uuid);
    },

    /**
     * 复制节点
     * @param uuid
     */
    async duplicate(uuid: string) {
        let uuids = vm.selects.slice();

        // 来自右击菜单的单个选中，右击节点不在已选项目里
        if (uuid !== undefined && !vm.selects.includes(uuid)) {
            uuids = [uuid];
        }

        if (uuids.length === 0) {
            return;
        }

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');

        const newSelected: string[] = []; // 新的选中项切换为选中项的对应复制节点
        let selectedTimer: any; // 重新选中的定时器

        async function _forEach(uuids: string[], parentUuid?: string) {
            // 多节点的复制，根据现有排序的顺序执行
            const nodes: any[] = uuids.map((uuid: string) => {
                return utils.getGroupFromTree(db.nodesTree, uuid)[0];
            }).filter(Boolean).sort((a, b) => {
                return a.top - b.top;
            });

            nodes.forEach((node: ItreeNode) => {
                let parent = parentUuid;
                if (!parent) {
                    parent = node.parentUuid;
                }

                if (!parent) {
                    return;
                }

                // 循环其子集
                let childrenUuids;
                if (Array.isArray(node.children)) {
                    childrenUuids = node.children.map((child: ItreeNode) => child.uuid);
                }

                (async (parent, uuid) => {
                    const newNodeUuid = await Editor.Ipc.requestToPackage('scene', 'create-node', {
                        parent,
                        dump: uuid,
                    });

                    if (!parentUuid) {
                        newSelected.push(newNodeUuid);

                        clearTimeout(selectedTimer);
                        selectedTimer = setTimeout(() => {
                            vm.ipcResetSelect(newSelected);
                        }, 200);
                    }

                    if (childrenUuids && childrenUuids.length > 0) {
                        await _forEach(childrenUuids, newNodeUuid);
                    }
                })(parent, node.uuid);
            });

        }
        await _forEach(uuids);
    },

    /**
     * 移动
     */
    move(json: IdragNode) {
        if (!json || !json.from || !json.to) {
            return;
        }

        const uuids = json.from.split(',');

        // @ts-ignore
        if (uuids.includes(json.to)) { // 移动的元素有重叠
            return;
        }

        const [toNode, toIndex, toArr, toParent] = utils.getGroupFromTree(db.nodesTree, json.to); // 将被注入数据的对象

        // 多节点的移动，根据现有排序的顺序执行
        const groups: any[] = uuids.map((uuid: string) => {
            return utils.getGroupFromTree(db.nodesTree, uuid);
        }).filter(Boolean).sort((a, b) => {
            return a[0].top - b[0].top;
        });

        // 开始执行
        groups.forEach((group: any) => {
            (async (group) => {
                const [fromNode, fromIndex, fromArr, fromParent] = group;

                const isSubChild = utils.getGroupFromTree(fromNode, json.to);
                if (isSubChild[0]) { // toNode 节点是 fromNode 的子集，所以父不能移到子里面
                    return;
                }

                // 移动的索引变动
                let offset = 0;
                // 受变动的节点
                let affectNode;

                // 内部平级移动
                // @ts-ignore
                if (['before', 'after'].includes(json.insert) && fromParent.uuid === toParent.uuid) {
                    // @ts-ignore
                    affectNode = utils.getNodeFromMap(fromParent.uuid); // 元素的父级

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
                    if (fromParent === toNode) { // 仍在原来的层级中
                        return;
                    }

                    // 先从原来的父级删除
                    await Editor.Ipc.sendToPackage('scene', 'remove-node', { uuid: fromNode.uuid });

                    // 再开始移动
                    if (json.insert === 'inside') { // 丢进元素里面，被放在尾部
                        // @ts-ignore
                        affectNode = utils.getNodeFromMap(toNode.uuid); // 元素自身
                        Editor.Ipc.sendToPackage('scene', 'set-property', {
                            uuid: fromNode.uuid,
                            path: 'parent',
                            dump: {
                                type: toNode.type,
                                value: {
                                    uuid: toNode.uuid, // 被 drop 的元素就是父级
                                },
                            },
                        });
                    } else { // 跨级插入 'before', 'after'
                        // @ts-ignore
                        affectNode = utils.getNodeFromMap(toParent); // 元素的父级
                        await Editor.Ipc.sendToPackage('scene', 'set-property', { // 先丢进父级
                            uuid: fromNode.uuid,
                            path: 'parent',
                            dump: {
                                type: toParent.type,
                                value: {
                                    uuid: toParent.uuid, // 被 drop 的元素就是父级
                                },
                            },
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
            })(group);
        });
    },

    /**
     * 树形数据已改变
     * 如节点增删改，是较大的变动，需要重新计算各个配套数据
     * 增加 setTimeOut 是为了优化来自异步的多次触发
     */
    changeData() {
        db.calcNodesTree(); // 重新计算树形数据

        this.render(); // 重新渲染出树形

        // 重新定位滚动条, +1 是为了增加离底距离
        vm.$parent.treeHeight = (db.nodesMap.size + 1) * db.nodeHeight;
    },

    /**
     * 重新渲染树形
     * nodes 存放被渲染的节点数据
     * 主要通过 nodes 数据的变动
     */
    render() {
        vm.nodes = []; // 先清空，这种赋值机制才能刷新 vue，而 .length = 0 不行

        const min = vm.scrollTop - db.nodeHeight; // 算出可视区域的 top 最小值
        const max = vm.viewHeight + vm.scrollTop; // 最大值

        for (const [top, json] of db.nodesMap) {
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
        const mode = scrollTop % db.nodeHeight;
        let top = scrollTop - mode;
        if (mode === 0 && scrollTop !== 0) {
            top -= db.nodeHeight;
        }

        vm.top = top; // 模拟出样式
        vm.scrollTop = scrollTop; // 新的滚动值
    },

    /**
     * 以下是工具函数：
     */
    getFirstSelect() { // 获取第一个选中节点，没有选中项，返回根节点
        if (!vm.selects[0] && db.nodesTree) {
            return db.nodesTree.uuid; // node 节点
        }
        return vm.selects[0]; // 当前选中的节点
    },
};
