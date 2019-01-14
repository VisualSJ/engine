'use strict';

import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';

const db = require('./tree-db');
const utils = require('./tree-utils');

let vm: any = null;

let isRefreshing: boolean = false; // 新增项目带来的请求重新渲染树形

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
        assets: [], // 当前树形在可视区域的资源节点
        selects: [], // 已选中项的 uuid
        twinkles: {}, // 需要闪烁的 uuid
        folds: {}, // 用于记录已展开的节点
        firstAllExpand: false, // 根据编辑器的配置来设置第一次的所有节点是否展开
        types: { file: 1, 'cc.Node': 2 }, // 收集所有 asset 的 type, 用于 ui-drag-area 的 droppable 设置
        renameSource: '', // 需要 rename 的节点的 url，只有一个
        intoView: '', // 定位显示资源，uuid, 只有一个
        search: '', // 搜索节点名称
        searchType: 'name', // 搜索类型
        allExpand: true, // 是否全部展开
        current: {}, // 当前选中项
        viewHeight: 0, // 当前树形的可视区域高度
        top: 0, // 当前树形的定位 top
        scrollTop: 0, // 当前树形的滚动数据
        selectBox: {}, // 拖动时高亮的目录区域 {top, left, height}
        copiedUuids: [], // 用于存放已复制节点的 uuid
        db,
        utils,
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
     * 搜索资源名称
     */
    search() {
        vm.doSearch();

        // 重新定位到选中项
        if (vm.search === '') {
            vm.intoView = '';
            vm.$nextTick(() => {
                if (vm.search === '') {
                    vm.intoView = vm.getFirstSelect();
                }
            });
        }
    },
    /**
     * 当前选中项变动
     */
    activeAsset() {
        vm.$parent.activeAsset = vm.activeAsset;
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
    refresh(intoView = false) {
        if (isRefreshing) { // 性能优化：避免导入带来的批量计算冲击
            return;
        }

        const delay = intoView ? 0 : 150; // 类似刷新的操作不需要延迟

        isRefreshing = true;
        setTimeout(() => { // 整体延迟
            isRefreshing = false;
            run();
        }, delay);

        async function run() {
            await db.refresh();
            if (!db.assetsTree) { // 容错处理，数据可能为空
                console.error('Assets data can not be empty.');
                return;
            }

            vm.changeData();

            // @ts-ignore 准备重新定位
            if (vm.renameSource !== '') {
                const asset = utils.getGroupFromTree(db.assetsTree, vm.renameSource, 'source')[0];
                if (asset) {
                    vm.intoView = asset.uuid;
                }
            } else if (intoView) {
                vm.$nextTick(() => {
                    utils.scrollIntoView(vm.intoView);
                });
            }
        }
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
        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
        for (const [top, asset] of db.assetsMap) {
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
            vm.current = utils.getAssetFromMap(uuid);

            // 延迟定位，避免 shift 多选后的界面闪烁
            clearTimeout(vm.selectTimer);
            vm.selectTimer = setTimeout(() => {
                if (show) {
                    vm.intoView = uuid;
                }
            }, 100);

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
                const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
                if (uuids.length === 0) {
                    return;
                }
                const one = utils.getAssetFromMap(uuid); // 当前给定的元素
                const first = utils.getAssetFromMap(uuids[0]); // 已选列表中的第一个元素
                if (one !== undefined && first !== undefined) {
                    const selects: string[] = [];
                    const min = one.top < first.top ? one.top : first.top;
                    const max = min === one.top ? first.top : one.top;
                    for (const [top, json] of db.assetsMap) {
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
                Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
            } else {
                Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
            }
        }
    },

    /**
     * 重新选中节点
     * @param uuid
     */
    ipcResetSelect(uuid: string | string[]) {
        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
        Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
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
     * 来自右击菜单，也来自批量导入
     * @param asset
     * @param json
     */
    async add(uuid: string) {
        utils.twinkle.add(uuid, 'shrink'); // 手动新增的时候，由于 uuid 还不存在，不会生效。
        vm.refresh();
    },

    /**
     * ipc 发起创建资源
     * @param asset
     * @param json
     */
    async ipcAdd(json: IaddAsset, uuid: string, filedata: any) {
        if (!uuid) {
            uuid = this.getFirstSelect();
        }

        const parent = utils.closestCanCreateAsset(uuid); // 自身或父级文件夹
        if (!parent) { // 没有可用的
            return;
        }

        let url = parent.source;
        if (!json.name) {
            switch (json.ext) {
                case 'folder': json.name = 'New Folder'; break;
                default: json.name = 'New File.' + json.ext; break;
            }
        }

        url += `/${json.name}`;

        parent.state = 'loading';
        if (parent.isExpand === false) {
            this.toggle(parent.uuid, true); // 重新展开父级节点
        }

        if (json.ext === 'folder') {
            filedata = null; // 注意，文件夹的内容必须传 null 过去
        }
        if (filedata === undefined) {
            filedata = '';

            const filepath = join(__dirname, `../../static/filecontent/${json.ext}`);
            if (existsSync(filepath)) {
                filedata = readFileSync(filepath, 'utf8');
            }
        }
        utils.twinkle.sleep();
        vm.renameSource = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, filedata);

        parent.state = '';
    },

    /**
     * 从树形删除资源节点
     */
    delete(uuid: string) {
        vm.refresh();
    },

    /**
     * ipc 发起删除资源
     * @param asset
     */
    async ipcDelete(uuid: string) {
        const code = await Editor.Dialog.show({ // 删除前询问
            type: 'question',
            default: 0,
            cancel: 1,
            title: Editor.I18n.t('assets.menu.delete'),
            message: Editor.I18n.t('assets.operate.sureDelete'),
        });

        if (code === 1) { // 取消
            return false;
        }

        if (uuid && !vm.selects.includes(uuid)) { // 如果该资源没有被选中，则只是删除此单个
            const asset = utils.getAssetFromTree(uuid);
            if (utils.canNotDeleteAsset(asset)) {
                return;
            }

            Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
            Editor.Ipc.sendToPackage('asset-db', 'delete-asset', asset.source);
        } else { // 如果该资源是被选中了，表明要删除所有选中项
            const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
            uuids.forEach((uuid: string) => {
                const asset = utils.getAssetFromTree(uuid);
                if (utils.canNotDeleteAsset(asset)) {
                    return;
                }

                asset.state = 'loading';
                Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
                Editor.Ipc.sendToPackage('asset-db', 'delete-asset', asset.source);
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
        const asset = utils.getAssetFromMap(uuid); // 获取该资源的数据，包含子资源
        if (asset && asset.isParent) {
            asset.isExpand = value !== undefined ? value : !asset.isExpand;

            this.changeData();

            if (asset.isRoot) {
                vm.checkAllToggleStatus();
            }

        }
    },

    /**
     * 小优化，给界面上的 allToggle 按钮准确的切换状态
     */
    checkAllToggleStatus() {
        let allCollapse: boolean = true;
        db.assetsTree.children.forEach((asset: ItreeAsset) => {
            if (asset.isRoot && asset.isExpand) {
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
        const one = utils.getAssetFromMap(uuid); // 当前给定的元素
        const first = utils.getAssetFromMap(uuids[0]); // 已选列表中的第一个元素
        if (one !== undefined && first !== undefined) {
            const selects: string[] = [];
            const min = one.top < first.top ? one.top : first.top;
            const max = min === one.top ? first.top : one.top;
            for (const [top, json] of db.assetsMap) {
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
    },

    /**
     * 来自快捷键的 rename
     */
    keyboardRename() {
        vm.selects.forEach((uuid: string) => {
            if (!vm.renameSource) {
                const asset = utils.getAssetFromTree(uuid);
                if (!utils.canNotRenameAsset(asset)) {
                    utils.scrollIntoView(uuid);
                    vm.$nextTick(() => {
                        vm.renameSource = asset.source;
                    });
                }
            }
        });
    },

    /**
     * 节点重名命
     * 这是异步的，只做发送
     * @param asset
     * @param name
     */
    async rename(asset: ItreeAsset, name = '') {
        if (asset.state === 'loading') {
            return false;
        }

        // @ts-ignore 清空需要 rename 的节点
        vm.renameSource = '';

        if (utils.canNotRenameAsset(asset) || name === '' || name === asset.name) {
            // name 存在且与之前的不一样才能重名命，否则还原状态
            asset.state = '';
            return;
        }
        asset.state = 'loading'; // 显示 loading 效果

        // 暂停闪烁检测
        utils.twinkle.sleep();

        // 重名命资源
        const isSuccess = await Editor.Ipc.requestToPackage('asset-db', 'rename-asset', asset.uuid, name);

        if (!isSuccess) {
            Editor.Dialog.show({
                type: 'error',
                message: Editor.I18n.t('assets.operate.renameFail'),
            });
            asset.state = '';
        }
    },

    /**
     * 执行搜索
     */
    doSearch() {
        // 搜索有变动都先滚回顶部
        utils.scrollIntoView();

        // 重新计算
        vm.changeData();
    },

    /**
     * 拖动中感知当前所处的文件夹，高亮此文件夹
     */
    dragOver(uuid: string) {
        // @ts-ignore
        const asset: ItreeAsset = utils.getAssetFromMap(uuid);
        if (!asset.isDirectory) {
            // @ts-ignore
            this.dragOver(asset.parentUuid);
            return;
        }

        const top = asset.top + db.padding;
        let height = asset.height;
        if (height > db.assetHeight) {
            height += 2;
        }
        // @ts-ignore
        this.selectBox = {
            left: vm.$parent.$refs.viewBox.scrollLeft + 'px',
            top: top + 'px',
            height: height + 'px',
        };
    },

    /**
     * 拖动中感知当前所处的文件夹，离开后取消高亮
     */
    dragLeave(uuid: string) {
        // @ts-ignore
        let asset: ItreeAsset = utils.getAssetFromMap(uuid);
        if (!asset.isDirectory) {
            // @ts-ignore
            asset = utils.getAssetFromMap(asset.parentUuid);
        }
        asset.state = '';
    },

    /**
     * tree 容器上的 drop
     * @param event
     */
    drop(event: Event) {
        // @ts-ignore
        const dragData = event.dataTransfer.getData('dragData');
        let data: IdragAsset;
        if (dragData === '') {
            // @ts-ignore
            data = {};
        } else {
            data = JSON.parse(dragData);
        }

        // @ts-ignore
        const rootUuid = vm.assets[0].uuid;
        // @ts-ignore
        const localFiles = Array.from(event.dataTransfer.files);
        if (localFiles && localFiles.length > 0) { // 从外部拖文件进来
            data.from = 'osFile';
            data.insert = 'inside';
            // @ts-ignore
            data.files = localFiles;
        }

        if (data.from) {  // 如果从根节点移动，则不需要移动
            const [node, index, arr, parent] = utils.getGroupFromTree(db.assetsTree, data.from, 'uuid');
            if (parent && parent.uuid === rootUuid) {  // 如果从根节点移动，又落回根节点，则不需要移动
                return;
            }
        }

        data.to = rootUuid; // 都归于根节点
        data.insert = 'inside';
        // @ts-ignore
        data.copy = event.ctrlKey;
        // @ts-ignore
        vm.ipcDrop(data);
    },

    /**
     * 进入 tree 容器
     * @param event
     */
    dragEnter(event: Event) {
        // @ts-ignore
        vm.dragOver(vm.assets[0].uuid);
    },

    /**
     * 资源拖动
     *
     * @param json
     */
    async ipcDrop(json: IdragAsset) {
        // 鼠标在此节点释放
        let toAsset: any = utils.getAssetFromTree(json.to);

        // 移动到节点的父级
        if (toAsset && !toAsset.isDirectory) {
            toAsset = utils.getAssetFromTree(toAsset.parentUuid);
        }
        if (utils.canNotCreateAsset(toAsset)) {
            return;
        }

        // 从外部拖文件进来
        if (json.type === 'osFile') {
            if (!Array.isArray(json.files)) { // 容错处理
                return;
            }

            let index = 0;
            let file: any;
            toAsset.state = 'loading'; // 显示 loading 效果
            if (toAsset.isExpand === false) {
                this.toggle(toAsset.uuid, true); // 重新展开父级节点
            }

            do {
                file = json.files[index];
                index++;
                utils.twinkle.sleep();
            } while (file && await Editor.Ipc.requestToPackage('asset-db', 'copy-asset', file.path, toAsset.source));

        } else if (json.type === 'cc.Node') { // 明确接受外部拖进来的节点 cc.Node
            const dump = await Editor.Ipc.requestToPackage('scene', 'query-node', json.from);
            const content = await Editor.Ipc.requestToPackage('scene', 'generate-prefab-data', json.from);
            vm.ipcAdd({ name: `${dump.name.value}.prefab` }, json.to, content);

        } else {
            if (!json.from) {
                return;
            }
            if (json.copy) { // 按住了 ctrl 键，拖动复制
                const uuids = json.from.split(',');
                vm.copy(uuids);
                vm.paste(json.to);
                return;
            }

            vm.move(json, toAsset);
        }
    },

    /**
     * 复制资源
     * @param uuid
     */
    copy(uuid: string | string[]) {
        let copies = [];
        if (Array.isArray(uuid)) {
            copies = uuid;
        } else { // uuid 是 字符
            // 来自右击菜单的单个选中，右击节点不在已选项目里
            if (uuid && !vm.selects.includes(uuid)) {
                copies = [uuid];
            } else {
                copies = vm.selects.slice();
            }
        }

        // 过滤不可复制的节点
        vm.copiedUuids = copies.filter((uuid: string) => {
            return uuid && !utils.canNotCopyAsset(utils.getAssetFromTree(uuid));
        });

        // 给复制的动作反馈成功
        vm.copiedUuids.forEach((uuid: string) => {
            utils.twinkle.add(uuid, 'light');
        });
    },

    /**
     * 粘贴
     * @param uuid 粘贴到此目标节点
     */
    async paste(uuid: string) {
        if (!uuid) {
            uuid = this.getFirstSelect();
        }

        const parent = utils.closestCanCreateAsset(uuid); // 自身或父级文件夹
        if (!parent) { // 没有可用的
            return;
        }

        const finallyCanPaste: string[] = []; // 最后可复制的项
        vm.copiedUuids.forEach((uuid: string) => {
            const asset = utils.getAssetFromTree(uuid);

            // 节点可复制
            const canCopy = !utils.canNotCopyAsset(asset);
            if (!canCopy) {
                const warn = `${Editor.I18n.t('assets.operate.copyFail')}: ${asset.name}`;
                console.warn(warn);
            }

            // 不是此目标节点的父节点（不在它的上级文件夹里）
            const notInside = utils.getGroupFromTree(asset, parent.uuid).length === 0 ? true : false;
            if (!notInside) {
                const warn = `${Editor.I18n.t('assets.operate.pasteFail_parent_into_child')}: ${asset.name}`;
                console.warn(warn);
            }

            if (canCopy && notInside) {
                finallyCanPaste.push(uuid);
            }
        });
        if (finallyCanPaste.length === 0) {
            return;
        }

        let index = 0;
        let asset;
        parent.state = 'loading'; // 显示 loading 效果
        if (parent.isExpand === false) {
            this.toggle(parent.uuid, true); // 重新展开父级节点
        }

        do {
            asset = utils.getAssetFromTree(finallyCanPaste[index]);
            index++;
            utils.twinkle.sleep();
        } while (asset && await Editor.Ipc.requestToPackage('asset-db', 'copy-asset', asset.source, parent.source));
    },

    /**
     * 移动
     */
    move(json: IdragAsset, toAsset: ItreeAsset) {
        if (!json || !json.from || !json.to) {
            return;
        }

        const uuids = json.from.split(',');

        // @ts-ignore
        if (uuids.includes(json.to)) { // 移动的元素有重叠
            return;
        }

        // 多资源移动，根据现有排序的顺序执行
        const groups: any[] = uuids.map((uuid: string) => {
            return utils.getGroupFromTree(db.assetsTree, uuid);
        }).filter(Boolean).sort((a, b) => {
            return a[0].top - b[0].top;
        });

        groups.forEach((group: any) => {
            const [fromAsset, fromIndex, fromArr, fromParent] = group;
            if (utils.canNotCopyAsset(fromAsset)) {
                return;
            }

            const isSubChild = utils.getGroupFromTree(fromAsset, json.to);
            if (isSubChild[0]) { // toAsset 是 fromAsset 的子集，所以父不能移到子里面
                return;
            }

            // 资源移动仍在原来的目录内，不需要移动
            if (toAsset.uuid === fromParent.uuid) {
                return;
            }

            utils.twinkle.sleep();

            // @ts-ignore 移动资源
            Editor.Ipc.sendToPackage('asset-db', 'move-asset', fromAsset.source, toAsset.source);
        });
    },

    /**
     * 树形数据已改变
     * 如资源增删改，是较大的变动，需要重新计算各个配套数据
     * 增加 setTimeOut 是为了优化来自异步的多次触发
     */
    changeData() {
        db.calcAssetsTree(); // 重新计算树形数据

        this.render(); // 重新渲染出树形

        // 容器的整体高度，重新定位滚动条, +1 是为了增加离底距离
        vm.$parent.treeHeight = (db.assetsMap.size + 1) * db.assetHeight;
    },

    /**
     * 重新渲染树形
     * vm.assets 为当前显示的那几个节点数据
     */
    render() {
        vm.assets = []; // 先清空，这种赋值机制才能刷新 vue，而 .length = 0 不行

        const min = vm.scrollTop - db.assetHeight; // 算出可视区域的 top 最小值
        const max = vm.viewHeight + vm.scrollTop; // 最大值

        for (const [top, json] of db.assetsMap) {
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
        const mode = scrollTop % db.assetHeight;
        let top = scrollTop - mode;
        if (mode === 0 && scrollTop !== 0) {
            top -= db.assetHeight;
        }

        vm.top = top; // 模拟出样式
        vm.scrollTop = scrollTop; // 新的滚动值
    },

    /**
     * 获取第一个选中节点，没有选中项，返回根节点
     */
    getFirstSelect() {
        if (!vm.selects[0] && db.assetsTree.children[0]) {
            return db.assetsTree.children[0].uuid; // asset 节点资源
        }
        return vm.selects[0]; // 当前选中的资源
    },

    /**
     * 定位资源并闪烁
     * @param uuid
     */
    twinkle(uuid: string) {
        utils.scrollIntoView(uuid);
        utils.twinkle.add(uuid, 'shake');
    },
};
