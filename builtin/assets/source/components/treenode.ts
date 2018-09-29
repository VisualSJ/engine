'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

const openAsset = require('./open');

export const name = 'treenode';

export const template = readFileSync(
    join(__dirname, '../../static/template/treenode.html'),
    'utf8'
);

export const props: string[] = [
    'asset',
    'selects',
];

export function data() {
    return {};
}

export const methods = {
    /**
     * 打开一个 asset
     * @param event
     * @param uuid
     */
    async open(event: Event, asset: ItreeAsset) {
        if (asset.state === 'disabled') {
            return;
        }

        const { fileext } = asset;

        if (openAsset[fileext]) {
            openAsset[fileext](asset);
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

        if (asset.state === 'disabled') {
            return;
        }

        event.stopPropagation();

        const self = this;

        Editor.Menu.popup({
            // @ts-ignore
            x: event.pageX,
            // @ts-ignore
            y: event.pageY,
            menu: [
                {
                    label: Editor.I18n.t('assets.menu.new'),
                    submenu: [
                        {
                            label: Editor.I18n.t('assets.menu.newFolder'),
                            click() {
                                // @ts-ignore
                                self.$emit('add', asset.uuid, { type: 'folder' });
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newJavascript'),
                            click() {
                                // @ts-ignore
                                self.$emit('add', asset.uuid, { type: 'javascript' });
                            }
                        },
                    ]
                },
                {
                    type: 'separator'
                },
                {
                    label: Editor.I18n.t('assets.menu.copy'),
                    click() {
                        // @ts-ignore
                        self.$emit('copy', asset.uuid);
                    }
                },
                {
                    label: Editor.I18n.t('assets.menu.paste'),
                    click() {
                        // @ts-ignore
                        self.$emit('paste', asset.uuid);
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: Editor.I18n.t('assets.menu.rename'),
                    click(event: Event) {
                        // @ts-ignore
                        self.rename(event, asset);
                    }
                },
                {
                    label: Editor.I18n.t('assets.menu.delete'),
                    click() {
                        // @ts-ignore
                        self.$emit('delete', asset.uuid);
                    }
                }
            ]
        });
    },
    /**
     * 选中某个节点
     * @param event
     * @param asset
     */
    click(event: Event, asset: ItreeAsset) {
        if (asset.state === 'disabled') {
            return;
        }

        // @ts-ignore
        if (event.ctrlKey || event.metaKey || event.shiftKey) { // 多选
            this.multipleSelect(event, asset);
        } else { // 单选
            Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
            Editor.Ipc.sendToPackage('selection', 'select', 'asset', asset.uuid);
        }

        // 允许点击的元素有动画，不能直接全部放开动画是因为滚动中vue节点都会变动，导致动画都在执行
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('animate', '');
        setTimeout(() => {
            target.removeAttribute('animate');
        }, 500);
    },
    /**
     * 多选
     * 按下 ctrl 或 shift
     * ctrl 支持取消已选中项
     */
    multipleSelect(event: Event, asset: ItreeAsset) {
        if (asset.state === 'disabled') {
            return;
        }

        const uuid = asset.uuid;
        // @ts-ignore
        if (event.ctrlKey || event.metaKey) {
            if (this.selects.includes(uuid)) {
                Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
            } else {
                Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
            }
            return;
        }

        // @ts-ignore
        if (event.shiftKey) {
            // const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
            // 如果之前没有选中节点，则只要选中当前点击的节点

            if (this.selects.length === 0) {
                Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
                return;
            } else {
                // @ts-ignore
                this.$emit('multiple', asset.uuid);
            }
        }
    },
    /**
     * 节点折叠切换
     * @param uuid
     */
    toggle(asset: ItreeAsset) {
        // @ts-ignore
        this.$parent.toggle(asset.uuid);
    },
    /**
     * 节点重名命
     * @param event
     * @param asset
     */
    rename(event: Event, asset: ItreeAsset) {
        if (asset.state === 'disabled') {
            return;
        }

        // 改变节点状态
        asset.state = 'input';

        // @ts-ignore
        this.$nextTick(() => {
            // @ts-ignore
            this.$refs.input[0].focus();
            // @ts-ignore
            this.$refs.input[0].setSelectionRange(0, asset.name.lastIndexOf('.'));
        });
    },
    /**
     * 提交重名命
     * @param asset
     */
    renameBlur(asset: ItreeAsset) {
        // @ts-ignore
        let newName = this.$refs.input[0].value.trim();

        // 文件的名称不能为空
        if (asset.name.lastIndexOf('.') !== -1) {
            if (newName.substring(0, newName.lastIndexOf('.')) === '') {
                newName = '';
            }
        }

        // @ts-ignore
        this.$emit('rename', asset, newName);
    },
    /**
     * 开始拖动
     * 只能传字符，所以用了.stringify
     * @param event
     * @param uuid
     */
    dragStart(event: Event, asset: ItreeAsset) {
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({
            from: asset.uuid
        }));

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
        if (asset.state === 'disabled') {
            return;
        }
        event.preventDefault(); // 阻止原生事件，这个对效果挺重要的
        // @ts-ignore
        const target: any = event.currentTarget;

        target.setAttribute('drag', 'over');

        target.setAttribute('insert', 'inside');

        target.setAttribute('active', '');

        // 拖动中感知当前所处的文件夹，高亮此文件夹
        // @ts-ignore
        this.$emit('dragover', asset.uuid);
    },
    /**
     * 拖动移开
     * @param event
     * @param uuid
     */
    dragLeave(event: Event, asset: ItreeAsset) {
        if (asset.state === 'disabled') {
            return;
        }
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('insert', '');
        target.setAttribute('drag', '');

        // 拖动中感知当前所处的文件夹，离开后取消高亮
        // @ts-ignore
        this.$emit('dragleave', asset.uuid);
    },
    /**
     * 放开鼠标，识别为 drop 事件后回调
     * @param event
     * @param uuid
     */
    drop(event: Event, asset: ItreeAsset) {
        event.preventDefault();

        // @ts-ignore
        const target: any = event.currentTarget;
        const insert = target.getAttribute('insert');
        target.setAttribute('insert', ''); // 还原节点状态
        target.setAttribute('drag', '');

        // 如果当前 ui-drag-area 面板没有 hoving 属性，说明不接受此类型的 drop
        // @ts-ignore
        if (!this.$el.hasAttribute('hoving')) {
            return;
        }

        // 尾部结束时重新选中的节点，默认为 drop 节点
        let selectId = asset.uuid;

        // @ts-ignore
        const dragData = event.dataTransfer.getData('dragData');

        if (dragData === '') { // 是从外部拖文件进来
            // @ts-ignore
            this.$emit('drop', asset, {
                from: 'osFile',
                insert: 'inside',
                to: asset.uuid,
                // @ts-ignore
                files: Array.from(event.dataTransfer.files),
            });
        } else { // 常规内部节点拖拽
            const data = JSON.parse(dragData);

            if (asset.uuid !== data.from) {  // 如果移动到自身节点，则不需要移动
                data.to = asset.uuid; // 被瞄准的节点
                data.insert = insert; // 在重新排序前获取数据

                // @ts-ignore
                this.$emit('drop', asset, data);

                // 重新选中被移动的节点
                selectId = data.from;
            }
        }
        // @ts-ignore
        this.$emit('dragleave', asset.uuid); // 取消拖动的高亮效果

        // @ts-ignore
        Editor.Ipc.sendToPackage('selection', 'select', 'asset', selectId);
    }
};

export function mounted() {
    // @ts-ignore
    this.$el.addEventListener('dragenter', () => {
        // 取消选中，避免样式重叠
        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');

        // @ts-ignore
        this.$emit('dragover', this.list[0].uuid); // 根节点
    });
}
