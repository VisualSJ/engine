'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

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
    async openNode(event: Event, item: ItreeNode) {
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
    mouseDown(event: Event, item: ItreeNode) {
        // @ts-ignore
        if (event.button !== 2) {
            return;
        }

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
                            label: 'none',
                            enabled: false,
                            click() {
                                // debugger;
                            }
                        }
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
                    label: Editor.I18n.t('assets.menu.delete'),
                    click() {
                        Editor.Ipc.sendToPackage('asset-db', 'delete-asset', item.uuid);
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
    selectNode(event: Event, item: ItreeNode) {
        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
        Editor.Ipc.sendToPackage('selection', 'select', 'asset', item.uuid);
    },
    /**
     * 节点折叠切换
     * @param uuid 
     */
    toggleNode(item: ItreeNode) {
        // @ts-ignore
        this.$emit('toggle', item.uuid);
    },
        /**
     * 节点重名命
     * @param event 
     * @param item 
     */
    renameNode(event: Event, item: ItreeNode) {
        // 改变节点状态
        item.state = 'input';

        // @ts-ignore
        this.$nextTick(() => {
            // @ts-ignore
            this.$refs.input[0].focus();
            // @ts-ignore
            this.$refs.input[0].select();
        });
    },
    /**
     * 提交重名命
     * @param item 
     */
    renameBlur(item: ItreeNode) {
        // @ts-ignore
        const newName = this.$refs.input[0].value.trim();

        // @ts-ignore
        this.$emit('rename', item, newName);
    },
    /**
     * 开始拖动
     * 只能传字符，所以用了.stringify
     * @param event 
     * @param uuid 
     */
    dragStart(event: Event, item: ItreeNode) {
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({
            from: item.uuid
        }));
    },
    /**
     * 拖动到元素的上面
     * 一个元素仍然识别为上中下三个区域
     * @param event 
     * @param uuid 
     */
    dragOver(event: Event, item: ItreeNode) {
        event.preventDefault(); // 阻止原生事件，这个对效果挺重要的
        event.stopPropagation();
        event.stopImmediatePropagation();
        // @ts-ignore
        const target: any = event.currentTarget;

        target.setAttribute('drag', 'over');

        const offset = target.getBoundingClientRect();

        // @ts-ignore
        if (event.clientY - offset.top <= 4) {
            target.setAttribute('insert', 'before'); // 偏上位置
            // @ts-ignore
        } else if (offset.bottom - event.clientY <= 4) {
            target.setAttribute('insert', 'after'); // 偏下位置
        } else {
            target.setAttribute('insert', 'inside'); // 中间位置
        }
    },
    /**
     * 拖动移开
     * @param event 
     * @param uuid 
     */
    dragLeave(event: Event, item: ItreeNode) {
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('insert', '');
        target.setAttribute('drag', '');
    },
    /**
     * 放开鼠标，识别为 drop 事件后回调
     * @param event 
     * @param uuid 
     */
    drop(event: Event, item: ItreeNode) {
        event.preventDefault();

        // @ts-ignore
        const data = JSON.parse(event.dataTransfer.getData('dragData'));
        data.to = item.uuid; // 被瞄准的节点

        // @ts-ignore
        const target: any = event.currentTarget;

        data.insert = target.getAttribute('insert'); // 在重新排序前获取数据

        target.setAttribute('insert', ''); // 还原节点状态
        target.setAttribute('drag', '');

        if (data.to === data.from) {  // 如果移动到自身节点，则不需要移动
            return;
        }

        // @ts-ignore
        this.$emit('drop', item, data);
    }
};
