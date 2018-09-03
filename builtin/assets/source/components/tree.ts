'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

export const template = readFileSync(
    join(__dirname, '../../static/template/tree.html'),
    'utf8'
);

let isDragOver: boolean;

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
        const asset = await Editor.Ipc.requestToPackage(
            'asset-db',
            'query-asset-info',
            item.uuid
        );
        const ext = extname(asset.source);
        if (ext === '.scene') {
            Editor.Ipc.sendToPackage('scene', 'open-scene', asset.uuid);
        }
    },
    mouseDown(event: Event, item: ItreeAsset) {
        // @ts-ignore
        if (event.button !== 2) {
            return;
        }

        let self = this;

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
                                self.$emit('new', item.uuid, { type: 'empty' });
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
                    click() { }
                },
                {
                    label: Editor.I18n.t('assets.menu.paste'),
                    click() { }
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
        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
        Editor.Ipc.sendToPackage('selection', 'select', 'asset', item.uuid);

        // 允许点击的元素有动画，不能直接全部放开动画是因为滚动中vue节点都会变动，导致动画都在执行
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('animate', '');
        setTimeout(() => {
            target.removeAttribute('animate');
        }, 500);
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

        let img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAICRAEAOw==';
        // @ts-ignore
        event.dataTransfer.setDragImage(img, 0, 0);

        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
    },
    /**
     * 拖动到元素的上面
     * 一个元素仍然识别为上中下三个区域
     * @param event 
     * @param uuid 
     */
    dragOver(event: Event, item: ItreeAsset) {
        event.preventDefault(); // 阻止原生事件，这个对效果挺重要的
        event.stopPropagation();
        event.stopImmediatePropagation();
        // @ts-ignore
        const target: any = event.currentTarget;

        target.setAttribute('drag', 'over');

        target.setAttribute('insert', 'inside');

        // 拖动中感知当前所处的文件夹，高亮此文件夹
        if (!isDragOver) {
            // @ts-ignore
            this.$emit('dragover', item.uuid);
            isDragOver = true;
        }
    },
    /**
     * 拖动移开
     * @param event 
     * @param uuid 
     */
    dragLeave(event: Event, item: ItreeAsset) {
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('insert', '');
        target.setAttribute('drag', '');

        // 拖动中感知当前所处的文件夹，离开后取消高亮
        // @ts-ignore
        this.$emit('dragleave', item.uuid);
        isDragOver = false;
    },
    /**
     * 放开鼠标，识别为 drop 事件后回调
     * @param event 
     * @param uuid 
     */
    drop(event: Event, item: ItreeAsset) {
        event.preventDefault();

        // @ts-ignore
        const data = JSON.parse(event.dataTransfer.getData('dragData'));
        data.to = item.uuid; // 被瞄准的节点

        // @ts-ignore
        const target: any = event.currentTarget;

        data.insert = target.getAttribute('insert'); // 在重新排序前获取数据

        target.setAttribute('insert', ''); // 还原节点状态
        target.setAttribute('drag', '');

        // 重新选中节点
        Editor.Ipc.sendToPackage('selection', 'select', 'asset', data.from);

        // @ts-ignore
        this.$emit('dragleave', item.uuid); // 取消拖动的高亮效果

        if (data.to === data.from) {  // 如果移动到自身节点，则不需要移动
            return;
        }

        // @ts-ignore
        this.$emit('drop', item, data);

    }
};
