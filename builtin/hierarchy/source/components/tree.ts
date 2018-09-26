'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/tree.html'), 'utf8');

export const props: string[] = [
    'list',
    'select',
];

export const name = 'tree';

export function data() {
    return {
        dragover: false
    };
}

export const methods = {
    /**
     * 右击菜单
     * @param event
     * @param item
     */
    mouseDown(event: Event, item: ItreeNode) {
        // @ts-ignore
        if (event.button !== 2) {
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
                    label: Editor.I18n.t('hierarchy.menu.newNode'),
                    submenu: [
                        {
                            label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
                            click() {
                                // @ts-ignore
                                self.$emit('new', item.uuid, { type: 'emptyNode' });
                            }
                        }
                    ]
                },
                {
                    type: 'separator'
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.copy'),
                    click() {
                        // @ts-ignore
                        self.$emit('copy', item.uuid);
                    }
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.paste'),
                    click() {
                        // @ts-ignore
                        self.$emit('paste', item.uuid);
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.rename'),
                    click(event: Event) {
                        // @ts-ignore
                        self.renameNode(event, item);
                    }
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.delete'),
                    click() {
                        // @ts-ignore
                        self.$emit('delete', item.uuid);
                    }
                },
            ]
        });
    },
    /**
     * 选中某个节点
     * 区分单选 和 多选
     * @param event
     * @param uuid
     */
    selectNode(event: Event, item: ItreeNode) {
        // @ts-ignore
        if (event.ctrlKey || event.metaKey || event.shiftKey) { // 多选
            this.multipleSelect(event, item);
        } else { // 单选
            Editor.Ipc.sendToPackage('selection', 'clear', 'node');
            Editor.Ipc.sendToPackage('selection', 'select', 'node', item.uuid);
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
    async multipleSelect(event: Event, item: ItreeNode) {
        const uuid = item.uuid;
        // @ts-ignore
        if (event.ctrlKey || event.metaKey) {
            const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'node');
            if (uuids.includes(uuid)) {
                Editor.Ipc.sendToPackage('selection', 'unselect', 'node', uuid);
            } else {
                Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
            }
            return;
        }

        // @ts-ignore
        if (event.shiftKey) {
            const uuids = await Editor.Ipc.requestToPackage('selection', 'query-select', 'node');
            // 如果之前没有选中节点，则只要选中当前点击的节点

            if (uuids.length === 0) {
                Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
                return;
            } else {
                // @ts-ignore
                this.$emit('multiple', item.uuid);
            }
        }
    },
    /**
     * 锁定 / 解锁节点
     * @param item
     */
    lockNode(item: ItreeNode) {
        // @ts-ignore
        this.$emit('lock', item.uuid);
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
            this.$refs.input[0].setSelectionRange(0, item.name.lastIndexOf('.'));
        });
    },
    /**
     * 提交重名命
     * @param item
     */
    renameBlur(item: ItreeNode) {
        // @ts-ignore
        let newName = this.$refs.input[0].value.trim();

        // 节点的名称不能为空
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
    dragStart(event: Event, item: ItreeNode) {
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
    dragOver(event: Event, item: ItreeNode) {
        event.preventDefault(); // 阻止原生事件，这个对效果挺重要的

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
        const target: any = event.currentTarget;
        target.setAttribute('insert', ''); // 还原节点状态
        target.setAttribute('drag', '');

        // 如果当前 ui-drag-area 面板没有 hoving 属性，说明不接受此类型的 drop
        // @ts-ignore
        if (!this.$el.hasAttribute('hoving')) {
            return;
        }

        // @ts-ignore
        const data = JSON.parse(event.dataTransfer.getData('dragData'));
        data.to = item.uuid; // 被瞄准的节点
        data.insert = target.getAttribute('insert'); // 在重新排序前获取数据

        if (data.to === data.from) {  // 如果移动到自身节点，则不需要移动
            return;
        }

        // @ts-ignore
        this.$emit('drop', item, data);
    }
};

export function mounted() {
    // @ts-ignore
    this.$el.addEventListener('dragenter', () => {
        // @ts-ignore
        this.dragover = true;
    });

    // @ts-ignore
    this.$el.addEventListener('dragleave', () => {
        // @ts-ignore
        this.dragover = false;
    });
}
