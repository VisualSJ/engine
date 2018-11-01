'use strict';
import { readFileSync } from 'fs';
import { stat } from 'fs-extra';
import { extname, join } from 'path';

export const name = 'tree-node';

export const template = readFileSync(
    join(__dirname, '../../static/template/tree-node.html'),
    'utf8'
);

export const props: string[] = [
    'node',
    'selects',
];

export function data() {
    return {
        draggable: true,
    };
}

export const watch = {
    'node.state'() {
        // @ts-ignore
        this.$nextTick(() => {
            // @ts-ignore
            const node = this.node;
            // @ts-ignore
            this.draggable = (node.state !== '' || node.invalid) ? false : true;
            // @ts-ignore
            if (node.state === 'input') {
                // @ts-ignore 选中该节点
                this.$emit('ipcSingleSelect', node.uuid);
                // @ts-ignore
                this.$refs.input.focus();
                // @ts-ignore
                this.$refs.input.setSelectionRange(0, node.name.lastIndexOf('.'));

                // @ts-ignore 父级的 state 也处于 input
                this.$parent.state = 'input';
            }
        });
    }
};

export const methods = {
    /**
     * 右击菜单
     * @param event
     * @param node
     */
    mouseDown(event: Event, node: ItreeNode) {
        // @ts-ignore
        if (event.button !== 2) {
            return;
        }
        event.stopPropagation();

        if (node.invalid) { // 不需要右击菜单的情况
            return;
        }

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
                                self.$emit('ipcAdd', { type: 'emptyNode' }, node.uuid);
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
                        self.$emit('copy', node.uuid);
                    }
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.paste'),
                    click() {
                        // @ts-ignore
                        self.$emit('paste', node.uuid);
                    }
                },
                { type: 'separator' },
                {
                    label: Editor.I18n.t('hierarchy.menu.rename'),
                    click(event: Event) {
                        // @ts-ignore
                        self.rename(node);
                    }
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.delete'),
                    click() {
                        // @ts-ignore
                        self.$emit('ipcDelete', node.uuid);
                    }
                },
                { type: 'separator' },
                {
                    label: Editor.I18n.t('hierarchy.menu.consoleLog'),
                    click() {
                        console.info(`UUID: ${node.uuid}`);
                    },
                },
            ]
        });
    },
    /**
     * 选中某个节点
     * @param event
     * @param node
     */
    click(event: Event, node: ItreeNode) {
        // 必要的，配合父级容器的点击事件
        event.stopPropagation();

        if (node.invalid) {
            return;
        }

        // @ts-ignore
        if (event.ctrlKey || event.metaKey || event.shiftKey) { // 多选
            // @ts-ignore
            this.$emit('ipcMultipleSelect', event.shiftKey ? true : false, node.uuid);
        } else { // 单选
            // @ts-ignore
            this.$emit('ipcSingleSelect', node.uuid);
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
     * 节点折叠切换
     * @param uuid
     */
    toggle(node: ItreeNode) {
        // @ts-ignore
        this.$parent.toggle(node.uuid);
    },

    /**
     * 节点重名命
     * @param event
     * @param node
     */
    rename(node: ItreeNode) {
        // 改变节点状态
        node.state = 'input';
    },
    /**
     * 提交重名命
     * @param node
     */
    renameSubmit(event: Event, node: ItreeNode) {
        // @ts-ignore
        const newName = this.$refs.input.value.trim();

        // @ts-ignore
        this.$emit('rename', node, newName);
    },
    /**
     * 取消重名命
     * @param node
     */
    renameCancel(event: Event, node: ItreeNode) {
        // @ts-ignore 需要这一步是因为 blur 也随即执行，需要保留原值阻止触发
        this.$refs.input.value = node.name;
        // @ts-ignore
        this.$emit('rename', node, node.name);
    },
    /**
     * 开始拖动
     * 只能传字符，所以用了.stringify
     * @param event
     * @param uuid
     */
    dragStart(event: Event, node: ItreeNode) {
        // @ts-ignore
        let uuid = node.uuid;
        // @ts-ignore
        if (this.selects.includes(uuid)) {
            // @ts-ignore
            uuid = this.selects.join(',');
        }
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({ from: uuid }));
        // @ts-ignore 给其他面板使用
        event.dataTransfer.setData('value', uuid);

        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAICRAEAOw==';
        // @ts-ignore
        event.dataTransfer.setDragImage(img, 0, 0);

        // 取消选中，避免样式重叠
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
    },
    /**
     * 拖动到元素的上面
     * 一个元素仍然识别为上中下三个区域
     * @param event
     * @param uuid
     */
    dragOver(event: Event, node: ItreeNode) {
        event.preventDefault(); // 阻止原生事件，这个对效果挺重要的
        // @ts-ignore
        const target: any = event.currentTarget;

        const offset = target.getBoundingClientRect();
        let position = 'inside'; // 中间位置
        // @ts-ignore
        if (event.clientY - offset.top <= 4) {
            position = 'before'; // 偏上位置
            // @ts-ignore
        } else if (offset.bottom - event.clientY <= 4) {
            position = 'after'; // 偏下位置
        }
        target.setAttribute('drag', 'over');
        target.setAttribute('insert', position);

        // 拖动中感知当前所处的位置
        // @ts-ignore
        this.$emit('dragOver', node.uuid, position);
    },
    /**
     * 拖动移开
     * @param event
     * @param uuid
     */
    dragLeave(event: Event, node: ItreeNode) {
        // @ts-ignore
        const target: any = event.currentTarget;
        target.removeAttribute('insert');
        target.removeAttribute('drag');

        // 拖动中感知当前所处的文件夹，离开后取消高亮
        // @ts-ignore
        this.$emit('dragLeave', node.uuid);
    },
    /**
     * 放开鼠标，识别为 drop 事件后回调
     * @param event
     * @param uuid
     */
    drop(event: Event, node: ItreeNode) {
        // 需要取消默认行为才能获取 dataTransfer 数据
        event.preventDefault();
        event.stopPropagation();

        // @ts-ignore
        const target: any = event.currentTarget;
        const insert = target.getAttribute('insert');
        target.removeAttribute('insert'); // 还原节点状态
        target.removeAttribute('drag');

        // 如果当前 ui-drag-area 面板没有 hoving 属性，说明不接受此类型的 drop
        // @ts-ignore
        if (!this.$parent.$el.hasAttribute('hoving')) {
            return;
        }

        if (node.invalid) { // 不可用节点，比如 uuid 不存在
            return;
        }

        // @ts-ignore
        const dragData = event.dataTransfer.getData('dragData');
        let data: IdragNode;
        if (dragData === '') {
            // @ts-ignore
            data = {};
        } else {
            data = JSON.parse(dragData);
        }

        data.to = node.uuid; // 被瞄准的节点
        data.insert = insert; // 在重新排序前获取数据

        // @ts-ignore
        this.$emit('drop', data);
    },

    /**
     * 锁定 / 解锁节点
     * @param item
     */
    lock(node: ItreeNode) {
        // @ts-ignore
        this.$emit('lock', node.uuid);
    },
};

export function mounted() {
    // @ts-ignore
    const node = this.node;
    if (node.state !== '' || node.invalid) {
        // @ts-ignore
        this.draggable = false;
    }
}
