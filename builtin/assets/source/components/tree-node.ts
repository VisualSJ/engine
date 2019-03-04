'use strict';
import { readFileSync } from 'fs';
import { basename, dirname, join } from 'path';

const open = require('./tree-node-open');
const context = require('./tree-node-context');
const utils = require('./tree-utils');

export const name = 'tree-node';

export const template = readFileSync(
    join(__dirname, '../../static/template/tree-node.html'),
    'utf8'
);

export const components = {
    'tree-node-icon': require('./tree-node-icon'),
};

export const props: string[] = [
    'asset',
    'selects',
    'twinkles',
    'renameSource',
    'addAsset',
];

export function data() {
    return {
        renameUuid: '',
        renameValue: '',
        renameInputState: '',
        addInputState: '',
    };
}

export const computed = {
    // @ts-ignore
    state() {
        // @ts-ignore
        const asset = this.asset;

        if (!asset) {
            return '';
        }

        // @ts-ignore
        if (asset.source && this.renameSource === asset.source) {
            // @ts-ignore 选中该节点
            return 'input';
            // @ts-ignore
        } else if (asset.source && this.addAsset.parentDir === asset.source) {
            // @ts-ignore 选中该节点
            return 'add';
        }

        return asset.state;
    },
    draggable() {
        // @ts-ignore
        const asset = this.asset;

        // @ts-ignore
        if (this.state !== '' || utils.canNotDragAsset(asset)) {
            return 'false';
        }

        return 'true';
    },
};

export const watch = {
    state() {
        // @ts-ignore
        const asset = this.asset;

        // @ts-ignore
        if (this.state === 'input') {
            // @ts-ignore
            this.renameUuid = asset.uuid;
            // @ts-ignore
            this.renameValue = asset.name;
            // @ts-ignore
            this.renameInputState = '';

            // @ts-ignore
            this.$nextTick(() => {
                // @ts-ignore
                if (this.$refs.renameInput) {
                    // @ts-ignore
                    this.$refs.renameInput.focus();
                    // @ts-ignore
                    this.$refs.renameInput.setSelectionRange(0, asset.fileName.length);
                }
            });
        }

        // @ts-ignore
        if (this.state === 'add') {
            // @ts-ignore
            const { name, ext } = this.addAsset;

            // @ts-ignore
            this.addInputState = '';

            // @ts-ignore
            this.$nextTick(() => {
                // @ts-ignore
                if (this.$refs.addInput) {
                    // @ts-ignore
                    this.$refs.addInput.focus();
                    // @ts-ignore
                    this.$refs.addInput.setSelectionRange(0, basename(name, ext).length);
                }
            });
        }
    },
};

export const methods = {
    /**
     * 翻译
     * @param {*} key
     */
    t(key: string): string {
        // @ts-ignore
        return this.$parent.t(key);
    },
    /**
     * 打开一个 asset
     * @param event
     * @param uuid
     */
    async open(event: Event, asset: ItreeAsset) {
        const { fileExt } = asset;

        if (asset.isDirectory) {
            this.toggle(event, asset);
        } else {
            if (open[fileExt]) {
                open[fileExt](asset);
            }
        }
    },
    /**
     * 右击菜单
     * @param event
     * @param asset
     */
    mouseDown(event: Event, asset: ItreeAsset) {
        // @ts-ignore
        if (event.button !== 2) {
            return;
        }
        event.stopPropagation();

        context.menu(this, asset);
    },
    /**
     * 选中某个节点
     * @param event
     * @param asset
     */
    click(event: Event, asset: ItreeAsset) {
        // @ts-ignore
        if (event.shiftKey) { // 多选
            // @ts-ignore
            this.$emit('ipcShiftClick', asset.uuid);
            // @ts-ignore
        } else if (event.ctrlKey || event.metaKey) {
            // @ts-ignore
            this.$emit('ipcCtrlClick', asset.uuid);
        } else { // 单选
            // @ts-ignore
            this.$emit('ipcSelect', asset.uuid);
        }
    },
    /**
     * 节点折叠切换
     * @param uuid
     */
    toggle(event: Event, asset: ItreeAsset) {
        // 允许点击的元素有动画，不能直接全部放开动画是因为滚动中vue节点都会变动，导致动画都在执行
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('animate', '');
        setTimeout(() => {
            target.removeAttribute('animate');
        }, 500);

        // @ts-ignore
        this.$emit('toggle', asset.uuid);
    },
    /**
     * 节点重名命
     * @param event
     * @param asset
     */
    rename(asset: ItreeAsset) {
        // 改变节点状态
        asset.state = 'input';
    },
    /**
     * 改变输入值时判断是否重名
     */
    renameChange(event: Event) {
        // @ts-ignore
        const {asset} = this;
        const parentAsset = utils.getAssetFromTree(asset.parentUuid);
        // @ts-ignore
        const filenames = parentAsset.children.map((one) => one.name).filter((name) => name !== asset.name);

        // @ts-ignore
        this.renameValue = this.$refs.renameInput.value.trim();
        let state = '';
        // @ts-ignore
        if (filenames.includes(this.renameValue)) {
            state = 'errorNewnameDuplicate';
            // @ts-ignore
        } else if (this.renameValue === '' || this.renameValue === asset.fileExt) {
            state = 'errorNewnameEmpty';
        }

        // @ts-ignore
        this.renameInputState = state;
    },
    /**
     * 提交重名命
     * @param asset
     */
    renameSubmit(event: Event) {
        // @ts-ignore
        const newName = this.$refs.renameInput.value.trim();

        // @ts-ignore
        this.$emit('rename', this.renameUuid, newName);
    },
    /**
     * 取消重名命
     * @param asset
     */
    renameCancel(event: Event) {
        // @ts-ignore
        this.$emit('rename', this.renameUuid, '');
    },
    /**
     * 改变输入值时判断是否重名
     */
    addChange(event: Event) {
        // @ts-ignore
        const {asset, addAsset} = this;
        // @ts-ignore
        const filenames = asset.children ? asset.children.map((one) => one.name) : [];

        // @ts-ignore
        addAsset.name = this.$refs.addInput.value.trim();
        let state = '';
        if (filenames.includes(addAsset.name)) {
            state = 'errorNewnameDuplicate';
        } else if (addAsset.name === '' || addAsset.name === addAsset.ext) {
            state = 'errorNewnameEmpty';
        }

        // @ts-ignore
        this.addInputState = state;
    },
    /**
     * 提交新增资源
     * @param event
     */
    addSubmit(event: Event) {
        // @ts-ignore
        const json: IaddAsset = Object.assign({}, this.addAsset);
        // @ts-ignore
        const newName = this.$refs.addInput.value.trim();
        // @ts-ignore
        if (newName === '' || newName === this.addAsset.ext || /[/\\]/.test(newName)) {
            // @ts-ignore
            this.$emit('addConfirm', null);
            return;
        }

        json.name = newName;
        // @ts-ignore
        json.parentUuid = this.asset.uuid;
        // @ts-ignore
        this.$emit('addConfirm', json);
    },
    /**
     * 取消新增
     * @param event
     */
    addCancel(event: Event) {
        // @ts-ignore
        this.$emit('addConfirm', null);
    },
    /**
     * 开始拖动
     * 只能传字符，所以用了.stringify
     * @param event
     * @param uuid
     */
    dragStart(event: Event, asset: ItreeAsset) {
        // @ts-ignore
        let uuid = asset.uuid;
        // @ts-ignore
        if (this.selects.includes(uuid)) {
            // @ts-ignore
            uuid = this.selects.join(',');
        }
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({
            from: uuid,
            type: asset.type,
        }));
        // @ts-ignore 给其他面板使用
        event.dataTransfer.setData('value', asset.redirect ? asset.redirect.uuid : uuid);

        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAICRAEAOw==';
        // @ts-ignore
        event.dataTransfer.setDragImage(img, 0, 0);
    },
    /**
     * 拖动到元素的上面
     * 一个元素仍然识别为上中下三个区域
     * @param event
     * @param uuid
     */
    dragOver(event: Event, asset: ItreeAsset) {
        event.preventDefault(); // 阻止原生事件，这个对效果挺重要的
        // @ts-ignore
        const target: any = event.currentTarget;

        target.setAttribute('drag', 'over');

        target.setAttribute('insert', 'inside');

        // 拖动中感知当前所处的文件夹，高亮此文件夹
        // @ts-ignore
        this.$emit('dragOver', asset.uuid);
    },
    /**
     * 拖动移开
     * @param event
     * @param uuid
     */
    dragLeave(event: Event, asset: ItreeAsset) {
        // @ts-ignore
        const target: any = event.currentTarget;
        target.removeAttribute('insert');
        target.removeAttribute('drag');

        // 拖动中感知当前所处的文件夹，离开后取消高亮
        // @ts-ignore
        this.$emit('dragLeave', asset.uuid);
    },
    /**
     * 放开鼠标，识别为 drop 事件后回调
     * 由于 dataTransfer 不能在 drop 事件中 setData，事件不能冒泡到 tree drop 环节再执行，这里就需要 $emit
     * @param event
     * @param uuid
     */
    drop(event: Event, asset: ItreeAsset) {
        event.preventDefault(); // 重要：阻止默认打开一些文件的行为

        // @ts-ignore
        const target: any = event.currentTarget;
        const insert = target.getAttribute('insert');
        target.removeAttribute('insert'); // 还原节点状态
        target.removeAttribute('drag');

        // 如果当前 ui-drag-area 面板没有 hoving 属性，说明不接受此类型的 drop
        // @ts-ignore
        const $tree = this.$parent.$el;
        if (!$tree.hasAttribute('hoving')) {
            return;
        } else {
            event.stopPropagation(); // 由于在 tree 环节也监听的 drop 事件，避免重复行为，这里阻断
            $tree.removeAttribute('hoving'); // 由于冒泡阻断了，需要手动移除状态
        }

        if (asset.readOnly) { // 不可用节点，比如 uuid 不存在
            return;
        }

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
        const localFiles = Array.from(event.dataTransfer.files);
        if (localFiles && localFiles.length > 0) { // 从外部拖文件进来
            data.type = 'osFile';
            data.insert = 'inside';
            // @ts-ignore
            data.files = localFiles;
        }

        data.to = asset.isSubAsset ? asset.parentUuid : asset.uuid; // 被瞄准的节点
        data.insert = insert; // 在重新排序前获取数据
        // @ts-ignore
        data.copy = event.ctrlKey;

        // @ts-ignore
        this.$emit('ipcDrop', data);

        // @ts-ignore
        this.$emit('dragLeave', asset.uuid); // 取消拖动的高亮效果

    },
};

export function mounted() {

}
