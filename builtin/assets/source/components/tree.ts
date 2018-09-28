'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

const openAsset = require('./openAsset');

export const template = readFileSync(
    join(__dirname, '../../static/template/tree.html'),
    'utf8'
);

export const props: string[] = [
    'list',
    'select',
];

export const name = 'tree';

export function data() {
    return {};
}

export const methods = {
    /**
     * 打开一个 asset
     * @param event
     * @param uuid
     */
    async openAsset(event: Event, item: ItreeAsset) {
        if (item.state === 'disabled') {
            return;
        }

        if (openAsset[item.fileext]) {
            openAsset[item.fileext](item.uuid);
        }
    },
    /**
     * 右击菜单
     * @param event
     * @param item
     */
    mouseDown(event: Event, item: ItreeAsset) {
        // @ts-ignore
        if (event.button !== 2) {
            return;
        }

        if (item.state === 'disabled') {
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
                                self.$emit('new', item.uuid, { type: 'folder' });
                            }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: Editor.I18n.t('assets.menu.newJavascript'),
                            click() {
                                // @ts-ignore
                                self.$emit('new', item.uuid, { type: 'javascript' });
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
                        self.$emit('copy', item.uuid);
                    }
                },
                {
                    label: Editor.I18n.t('assets.menu.paste'),
                    click() {
                        // @ts-ignore
                        self.$emit('paste', item.uuid);
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: Editor.I18n.t('assets.menu.rename'),
                    click(event: Event) {
                        // @ts-ignore
                        self.renameAsset(event, item);
                    }
                },
                {
                    label: Editor.I18n.t('assets.menu.delete'),
                    click() {
                        // @ts-ignore
                        self.$emit('delete', item.uuid);
                    }
                }
            ]
        });
    },
    /**
     * 选中某个节点
     * @param event
     * @param item
     */
    selectAsset(event: Event, item: ItreeAsset) {
        if (item.state === 'disabled') {
            return;
        }

        // @ts-ignore
        if (event.ctrlKey || event.metaKey || event.shiftKey) { // 多选
            this.multipleSelect(event, item);
        } else { // 单选
            Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
            Editor.Ipc.sendToPackage('selection', 'select', 'asset', item.uuid);
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
    async multipleSelect(event: Event, item: ItreeAsset) {
        if (item.state === 'disabled') {
            return;
        }

        const uuid = item.uuid;
        // @ts-ignore
        if (event.ctrlKey || event.metaKey) {
            const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
            if (uuids.includes(uuid)) {
                Editor.Ipc.sendToPackage('selection', 'unselect', 'asset', uuid);
            } else {
                Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
            }
            return;
        }

        // @ts-ignore
        if (event.shiftKey) {
            const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'asset');
            // 如果之前没有选中节点，则只要选中当前点击的节点

            if (uuids.length === 0) {
                Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
                Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
                return;
            } else {
                // @ts-ignore
                this.$emit('multiple', item.uuid);
            }
        }
    },
    /**
     * 节点折叠切换
     * @param uuid
     */
    toggleAsset(item: ItreeAsset) {
        // @ts-ignore
        this.$emit('toggle', item.uuid);
    },
    /**
     * 节点重名命
     * @param event
     * @param item
     */
    renameAsset(event: Event, item: ItreeAsset) {
        if (item.state === 'disabled') {
            return;
        }

        // 改变节点状态
        item.state = 'input';

        // @ts-ignore
        this.$nextTick(() => {
            // @ts-ignore
            this.$refs.input[0].focus();
            // @ts-ignore
            this.$refs.input[0].setSelectionRange(0, item.name.lastIndexOf('.'));
        });
    },
    /**
     * 提交重名命
     * @param item
     */
    renameBlur(item: ItreeAsset) {
        // @ts-ignore
        let newName = this.$refs.input[0].value.trim();

        // 文件的名称不能为空
        if (item.name.lastIndexOf('.') !== -1) {
            if (newName.substring(0, newName.lastIndexOf('.')) === '') {
                newName = '';
            }
        }

        // @ts-ignore
        this.$emit('rename', item, newName);
    },
    /**
     * 开始拖动
     * 只能传字符，所以用了.stringify
     * @param event
     * @param uuid
     */
    dragStart(event: Event, item: ItreeAsset) {
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({
            from: item.uuid
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
    dragOver(event: Event, item: ItreeAsset) {
        if (item.state === 'disabled') {
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
        this.$emit('dragover', item.uuid);
    },
    /**
     * 拖动移开
     * @param event
     * @param uuid
     */
    dragLeave(event: Event, item: ItreeAsset) {
        if (item.state === 'disabled') {
            return;
        }
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('insert', '');
        target.setAttribute('drag', '');

        // 拖动中感知当前所处的文件夹，离开后取消高亮
        // @ts-ignore
        // this.$emit('dragleave', item.uuid);
    },
    /**
     * 放开鼠标，识别为 drop 事件后回调
     * @param event
     * @param uuid
     */
    drop(event: Event, item: ItreeAsset) {
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
        let selectId = item.uuid;

        // @ts-ignore
        const dragData = event.dataTransfer.getData('dragData');

        if (dragData === '') { // 是从外部拖文件进来
            // @ts-ignore
            this.$emit('drop', item, {
                from: 'osFile',
                insert: 'inside',
                to: item.uuid,
                // @ts-ignore
                files: Array.from(event.dataTransfer.files),
            });
        } else { // 常规内部节点拖拽
            const data = JSON.parse(dragData);

            if (item.uuid !== data.from) {  // 如果移动到自身节点，则不需要移动
                data.to = item.uuid; // 被瞄准的节点
                data.insert = insert; // 在重新排序前获取数据

                // @ts-ignore
                this.$emit('drop', item, data);

                // 重新选中被移动的节点
                selectId = data.from;
            }
        }
        // @ts-ignore
        this.$emit('dragleave', item.uuid); // 取消拖动的高亮效果

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
