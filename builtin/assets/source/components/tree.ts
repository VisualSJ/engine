'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

const db = require('./tree-db');

let vm: any = null;

const assetHeight: number = 20; // 配置每个资源的高度，需要与css一致
const iconWidth: number = 18; // 树形节点 icon 的宽度
const padding: number = 4; // 树形头部的间隔，为了保持美观

let timeOutId: any;
/**
 * 考虑到 key 是数字且要直接用于运算，Map 格式的效率会高一些
 * 将所有有展开的资源按照 key = position.top 排列，value = ItreeAsset
 * 注意：仅包含有展开显示的资源
 */
const assetsMap: Map<number, ItreeAsset> = new Map();

let treeData: any; // 树形结构的数据，含 children

const trash: any = {}; // 回收站，主要用于移动中，异步的先从一个父级删除节点，再添加另一个父级的过程

let copiedUuids: string[] = []; // 用于存放已复制节点的 uuid

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
        assets: [], // 当前树形在可视区域的资源数据
        selects: [], // 已选中项的 uuid
        folds: {}, // 用于记录已展开的节点
        search: '', // 搜索节点名称
        allExpand: true, // 是否全部展开
        current: {}, // 当前选中项
        viewHeight: 0, // 当前树形的可视区域高度
        top: 0, // 当前树形的定位 top
        scrollTop: 0, // 当前树形的滚动数据
        selectBox: false, // 拖动时高亮的目录区域 {top, height} 或者 false 不显示
        newAssetNeedToRename: false // 由于是异步，存在新建，拖拽进新文件，移动资源这三个过程的新建无法区分，所以需要用第三方变量记录该 rename 的时候
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
     * 搜索资源名称
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
    activeAsset() {
        vm.$parent.activeAsset = vm.activeAsset;
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
        // @ts-ignore
        const dragData = event.dataTransfer.getData('dragData');
        let data: IdragAsset;
        // @ts-ignore
        const rootUuid = this.assets[0].uuid;

        if (dragData === '') {
            // @ts-ignore
            data = {};
        } else {
            data = JSON.parse(dragData);
        }

        // @ts-ignore
        const localFiles = Array.from(event.dataTransfer.files);
        if (localFiles && localFiles.length > 0) { // 从外部拖文件进来
            data.from = 'osFile';
            data.insert = 'inside';
            // @ts-ignore
            data.files = localFiles;
        }

        data.to = rootUuid; // 都归于根节点
        data.insert = 'inside';

        if (data.from) {  // 如果从根节点移动，则不需要移动
            const arr = getGroupFromTree(treeData, data.from, 'uuid');
            if (arr[3] && arr[3].uuid === data.to) {  // 如果从根节点移动，又落回根节点，则不需要移动
                return;
            }
        }
        // @ts-ignore
        this.drop(data);

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
        treeData = await db.refresh();
        if (!treeData) { // 容错处理，数据可能为空
            return;
        }
        // console.log(dbdata); return;
        //
        // treeData = {
        //     depth: -1,
        //     invalid: true,
        //     children: toTree(dbdata),
        // };

        this.changeData();
        selectsIntoView();
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
        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
        for (const [top, asset] of assetsMap) {
            Editor.Ipc.sendToPackage('selection', 'select', 'asset', asset.uuid);
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
            vm.current = getAssetFromMap(uuid);
            if (show) {
                selectsIntoView();
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
        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
        Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
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
                    Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                    Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
                    return;
                }
                const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
                if (uuids.length === 0) {
                    return;
                }
                const one = getAssetFromMap(uuid); // 当前给定的元素
                const first = getAssetFromMap(uuids[0]); // 已选列表中的第一个元素
                if (one !== undefined && first !== undefined) {
                    const selects: string[] = [];
                    const min = one.top < first.top ? one.top : first.top;
                    const max = min === one.top ? first.top : one.top;
                    for (const [top, json] of assetsMap) {
                        if (min <= top && top <= max) {
                            selects.push(json.uuid);
                        }
                    }
                    selects.splice(selects.findIndex((id) => id === first.uuid), 1);
                    selects.unshift(first.uuid);
                    selects.splice(selects.findIndex((id) => id === one.uuid), 1);
                    selects.push(one.uuid);

                    Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                    Editor.Ipc.sendToPackage('selection', 'select', 'asset', selects);
                }
            }
        } else { // event.ctrlKey || event.metaKey
            // @ts-ignore
            if (this.selects.includes(uuid)) {
                Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
            } else {
                Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
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
     * 添加资源到树形，资源已创建，来自 ipc 通知
     * @param asset
     * @param json
     */
    async add(uuid: string) {
        const arr = await db.ipcQuery(uuid);

        arr.forEach((newNode: ItreeAsset) => {
            // const parent = addAssetIntoTree(treeData.children, newNode);
            // if (!parent) {
            //     return;
            // }
            // parent.state = ''; // 还原状态
            // parent.isExpand = true; // 展开显示
            // sortData(parent.children, false);

            // @ts-ignore 检查是否需要重名命
            if (this.newAssetNeedToRename && !newNode.invalid && !newNode.readonly) {
                newNode.state = 'input';
            }
        });
        // 触发节点数据已变动
        this.changeData();
    },

    /**
     * ipc 发起创建资源
     * @param asset
     * @param json
     */
    ipcAdd(json: IaddAsset, uuid: string) {
        if (!uuid) {
            uuid = this.getFirstSelect();
        }

        // 获取该资源
        const one = getGroupFromTree(treeData, uuid);
        let url = one[0].source;

        if (one[0].isDirectory !== true) { // 不是目录，指向父级级
            url = one[3].source;
        }

        switch (json.ext) {
            case 'folder': url += '/New Folder'; break;
            default: url += '/New File.' + json.ext; break;
        }

        Editor.Ipc.sendToPackage('asset-db', 'create-asset', url, json.ext === 'folder' ? null : '');

        // @ts-ignore 新建成功后需要 rename
        this.newAssetNeedToRename = true;
    },

    /**
     * 从树形删除资源节点
     */
    delete(uuid: string) {
        const arr = getGroupFromTree(treeData, uuid);
        if (arr[2]) {
            arr[2].splice(arr[1], 1);
        }

        // 触发节点数据已变动
        this.changeData();
    },

    /**
     * ipc 发起删除资源
     * @param asset
     */
    async ipcDelete(uuid: string) {
        if (uuid && !vm.selects.includes(uuid)) { // 如果该资源没有被选中，则只是删除此单个
            const asset = getValidAsset(uuid);
            if (!asset) { // 删除的节点不可用，不允许删除
                return;
            }

            Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
            Editor.Ipc.sendToPackage('asset-db', 'delete-asset', asset.source);
        } else { // 如果该资源是被选中了，表明要删除所有选中项
            const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
            uuids.forEach((uuid: string) => {
                const asset = getValidAsset(uuid);
                if (asset) {
                    Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
                    Editor.Ipc.sendToPackage('asset-db', 'delete-asset', asset.source);
                }
            });
            // 重置所有选中
            vm.selects = [];
        }
    },

    /**
     * 资源的折叠切换
     * @param uuid
     */
    toggle(uuid: string, value: boolean) {
        const one = getAssetFromMap(uuid); // 获取该资源的数据，包含子资源
        if (one && one.isParent) {
            one.isExpand = value !== undefined ? value : !one.isExpand;

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
                Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                Editor.Ipc.sendToPackage('selection', 'select', 'asset', current.uuid);
            }
        }
    },

    /**
     * 按住 shift 键，同时上下选择
     */
    async shiftUpDown(direction: string) {
        // 同时按住了 shift 键
        const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
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
        const one = getAssetFromMap(uuid); // 当前给定的元素
        const first = getAssetFromMap(uuids[0]); // 已选列表中的第一个元素
        if (one !== undefined && first !== undefined) {
            const selects: string[] = [];
            const min = one.top < first.top ? one.top : first.top;
            const max = min === one.top ? first.top : one.top;
            for (const [top, json] of assetsMap) {
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
     * @param asset
     * @param name
     */
    rename(asset: ItreeAsset, name = '') {
        // @ts-ignore 还原需要 rename 的状态，手动新增资源的时候会先标注为 true
        this.newAssetNeedToRename = false;

        const one = getValidAsset(asset.uuid); // 获取该资源的数据

        if (!one || name === '' || name === asset.name) {
            // name 存在且与之前的不一样才能重名命，否则还原状态
            asset.state = '';
            return;
        }

        // 重名命资源
        Editor.Ipc.sendToPackage('asset-db', 'rename-asset', asset.uuid, name);

        asset.state = 'loading'; // 显示 loading 效果
    },

    /**
     * 拖动中感知当前所处的文件夹，高亮此文件夹
     */
    dragOver(uuid: string) {
        // @ts-ignore
        const node: ItreeAsset = getAssetFromMap(uuid);
        if (!node.isDirectory) {
            // @ts-ignore
            this.dragOver(node.parentUuid);
            return;
        }

        node.state = 'over';
        // @ts-ignore
        this.dirBox = [node.top + 4, node.height > assetHeight ? (node.height + 3) : node.height];
    },

    /**
     * 拖动中感知当前所处的文件夹，离开后取消高亮
     */
    dragLeave(uuid: string) {
        // @ts-ignore
        let node: ItreeAsset = getAssetFromMap(uuid);
        if (!node.isDirectory) {
            // @ts-ignore
            node = getAssetFromMap(node.parentUuid);
        }
        node.state = '';
    },

    /**
     * 资源拖动
     *
     * @param json
     */
    drop(json: IdragAsset) {
        // @ts-ignore 隐藏高亮框
        this.dirBox = false;

        // 不是拖动的话，取消
        if (json.insert !== 'inside') {
            return;
        }

        const toData = getGroupFromTree(treeData, json.to);
        let toNode = getValidAsset(json.to); // 将被注入数据的对象
        if (!toNode) {
            return;
        }

        if (!toNode.isDirectory) {
            // @ts-ignore
            toNode = getValidAsset(toData[3].uuid); // 节点的父级
        }

        if (!toNode) {
            return;
        }

        let doIpc = false;
        if (json.from === 'osFile') { // 从外部拖文件进来
            // @ts-ignore
            json.files.forEach((one) => {
                // @ts-ignore
                importAsset(toNode.uuid, one.path);
                doIpc = true;
            });
        } else {
            if (!json.from) {
                return;
            }

            const uuids = json.from.split(',');
            uuids.forEach((fromId: string) => {
                const [fromNode, fromIndex, fromArr, fromParent] = getGroupFromTree(treeData, fromId);
                if (!fromNode || fromNode.invalid || fromNode.isSubAsset) {
                    return;
                }

                // @ts-ignore
                if (toNode.uuid === fromParent.uuid) { // 资源移动仍在原来的目录内，不需要移动
                    return;
                }
                // @ts-ignore 移动资源
                Editor.Ipc.sendToPackage('asset-db', 'move-asset', fromNode.source, toNode.source);
                doIpc = true;
            });
        }

        if (doIpc) {
            toNode.state = 'loading'; // 显示 loading 效果
        }
    },

    /**
     * 复制资源
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
    paste(uuid: string) {
        if (!uuid) {
            uuid = this.getFirstSelect();
        }
        copiedUuids.forEach((id: string) => {
            const asset = getValidAsset(id);
            if (asset) {
                importAsset(uuid, asset.source);
            }
        });
    },

    /**
     * 树形数据已改变
     * 如资源增删改，是较大的变动，需要重新计算各个配套数据
     */
    changeData() {
        clearTimeout(timeOutId);
        timeOutId = setTimeout(() => {

            assetsMap.clear(); // 清空数据

            calcAssetPosition(); // 重算排位

            calcDirectoryHeight(); // 计算文件夹的高度

            this.render(); // 重新渲染出树形

            // 重新定位滚动条, +1 是为了增加离底距离
            vm.$parent.treeHeight = (assetsMap.size + 1) * assetHeight;
        }, 100);
    },

    /**
     * 重新渲染树形
     * assets 存放被渲染的资源数据
     * 主要通过 assets 数据的变动
     */
    render() {
        vm.assets = []; // 先清空，这种赋值机制才能刷新 vue，而 .length = 0 不行

        const min = vm.scrollTop - assetHeight; // 算出可视区域的 top 最小值
        const max = vm.viewHeight + vm.scrollTop; // 最大值

        for (const [top, json] of assetsMap) {
            if (top >= min && top <= max) { // 在可视区域才显示
                vm.assets.push(json);
            }
        }
    },

    /**
     * 滚动了多少，调整滚动条位置
     * @param scrollTop
     */
    scroll(scrollTop = 0) {
        const mode = scrollTop % assetHeight;
        let top = scrollTop - mode;
        if (mode === 0 && scrollTop !== 0) {
            top -= assetHeight;
        }

        vm.top = top; // 模拟出样式
        vm.scrollTop = scrollTop; // 新的滚动值
    },

    /**
     * 以下是工具函数：
     */
    getFirstSelect() { // 获取第一个选中节点，没有选中项，返回根节点
        if (!vm.selects[0]) {
            return treeData.children[0].uuid; // asset 节点资源
        }
        return vm.selects[0]; // 当前选中的资源
    }
};

/**
 * 计算所有树形资源的位置数据，这一结果用来做快速检索
 * 重点是设置 assetsMap 数据
 * 返回当前序号
 * @param obj
 * @param index 资源的序号
 * @param depth 资源的层级
 */
function calcAssetPosition(obj = treeData, index = 0, depth = 0) {
    if (!obj || !Array.isArray(obj.children)) {
        return index;
    }

    obj.children.forEach((one: ItreeAsset) => {
        if (!one) {
            return;
        }

        const start = index * assetHeight;  // 起始位置

        // 扩展属性
        one.depth = depth;
        one.top = start;
        one.left = depth * iconWidth + padding;

        if (vm.folds[one.uuid] === undefined) {
            vm.folds[one.uuid] = one.isParent ? true : false;
        }

        if (one.isExpand === undefined) {
            Object.defineProperty(one, 'isExpand', {
                configurable: true,
                enumerable: true,
                get() {
                    return vm.folds[one.uuid];
                },
                set(val) {
                    vm.folds[one.uuid] = val;
                },
            });
        }

        if (one.height === undefined) {
            Object.defineProperty(one, 'height', {
                configurable: true,
                enumerable: true,
                get() {
                    return this._height;
                },
                set: addHeight.bind(one),
            });
        }

        if (vm.search === '') { // 没有搜索
            vm.state = '';
            assetsMap.set(start, one);
            index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

            if (one.isParent && one.isExpand === true) {
                index = calcAssetPosition(one, index, depth + 1); // depth 是该资源的层级
            }
        } else { // 有搜索
            vm.state = 'search';

            // @ts-ignore
            if (!one.invalid && !one.readonly && one.name.search(vm.search) !== -1) { // 平级保存
                one.depth = 0; // 平级保存
                assetsMap.set(start, one);
                index++;
            }

            if (one.isParent) {
                index = calcAssetPosition(one, index, 0);
            }
        }
    });
    // 返回序号
    return index;
}

/**
 * 增加文件夹的高度
 * add 为数字，1 表示有一个 children
 */
function addHeight(add: number) {
    if (add > 0) {
        // @ts-ignore
        this._height += assetHeight * add;

        // 触发其父级高度也增加
        for (const [top, asset] of assetsMap) {
            // @ts-ignore
            if (this.parentSource === asset.source) {
                asset.height = add;
                break;
            }
        }
    } else {
        // @ts-ignore
        this._height = this.depth === 0 ? assetHeight : 0;
    }
}

/**
 * 计算一个文件夹的完整高度
 */
function calcDirectoryHeight() {
    for (const [top, parent] of assetsMap) {
        if (parent.isExpand && parent.children && parent.children.length > 0) {
            parent.height = parent.children.length; // 实际计算在内部的 setter 函数
        } else {
            parent.height = 0;
        }
    }
}

/**
 * 重置某些属性，比如全部折叠或全部展开
 * @param obj
 * @param props
 */
function resetTreeProps(props: any, tree: ItreeAsset[] = treeData.children) {
    const keys = Object.keys(props);
    tree.forEach((asset: ItreeAsset) => {
        for (const k of keys) {
            // @ts-ignore
            asset[k] = props[k];
        }

        if (asset.children) {
            resetTreeProps(props, asset.children);
        }
    });
}

/**
 * 获取一组资源的位置信息
 * 资源节点对象 node,
 * 对象所在数组索引 index，
 * 所在数组 array，
 * 所在数组其所在的对象 object
 * 返回 [node, index, array, object]
 *
 * 找不到资源 返回 []
 * @param arr
 * @param uuid
 */
function getGroupFromTree(obj: ItreeAsset, value: string = '', key: string = 'uuid'): any {
    let rt = [];

    if (!obj || !obj.children) {
        return [];
    }
    // @ts-ignore
    if (obj[key] === value) { // 次要寻找包体 自身对象，比如根节点自身
        return [obj];
    }

    let arr = obj.children; // 主要寻找包体是 .children
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
function getValidAsset(uuid: string) {
    const one = getAssetFromMap(uuid);
    if (!one || one.readOnly) { // 资源不可用
        return;
    }
    return one;
}

/**
 * 更快速地找到单个资源节点
 */
function getAssetFromMap(uuid = '') {
    for (const [top, asset] of assetsMap) {
        if (uuid === asset.uuid) {
            return asset;
        }
    }
    return;
}

/**
 * 找到当前节点及其前后节点
 * [current, prev, next]
 */
function getSiblingsFromMap(uuid = '') {
    const assets = Array.from(assetsMap.values());
    const length = assets.length;
    let current = assets[0];
    let next = assets[1];
    let prev = assets[length - 1];
    let i = 0;

    for (const [top, json] of assetsMap) {
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
 * 外部文件系统拖进资源
 * @param uuid 创建的位置
 * @param path 资源路径
 */
function importAsset(uuid: string, source: string) {
    const dest = getValidAsset(uuid);
    if (!dest) {
        return;
    }
    Editor.Ipc.sendToPackage('asset-db', 'copy-asset', source, dest.source);
}

/**
 * 展开选中项并处于视角中
 */
function selectsIntoView() {
    scrollIntoView(vm.getFirstSelect());
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
    const [one, index, arr, parent] = getGroupFromTree(treeData, uuid);
    if (one) { // 如果 A ：存在，
        // 情况 B ：判断是否在可视范围，
        if (
            (vm.scrollTop - assetHeight) < one.top &&
            one.top < (vm.scrollTop + vm.viewHeight - assetHeight)
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

        if (expandAsset(uuid)) {
            vm.changeData();
            scrollIntoView(uuid);
        }
    }
}

/**
 * 展开树形资源节点
 */
function expandAsset(uuid: string): boolean {
    const [asset, index, arr, parent] = getGroupFromTree(treeData, uuid);
    if (!asset) {
        return false;
    }
    asset.isExpand = true;
    if (parent && parent.uuid) {
        return expandAsset(parent.uuid);
    }
    return true;
}
