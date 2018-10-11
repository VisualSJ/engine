'use strict';
import { readFileSync } from 'fs';
import { stat } from 'fs-extra';
import { extname, join } from 'path';

export const name = 'treenode';

export const template = readFileSync(
    join(__dirname, '../../static/template/treenode.html'),
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
                        self.$emit('delete', node.uuid);
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
    renameBlur(event: Event, node: ItreeNode) {
        // @ts-ignore
        const newName = this.$refs.input.value.trim();

        // @ts-ignore
        this.$emit('rename', node, newName);
    },
    /**
     * 开始拖动
     * 只能传字符，所以用了.stringify
     * @param event
     * @param uuid
     */
    dragStart(event: Event, node: ItreeNode) {
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({
            from: node.uuid
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
    dragOver(event: Event, node: ItreeNode) {
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
    dragLeave(event: Event, node: ItreeNode) {
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('insert', '');
        target.setAttribute('drag', '');

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

        // @ts-ignore
        const target: any = event.currentTarget;
        const insert = target.getAttribute('insert');
        target.setAttribute('insert', ''); // 还原节点状态
        target.setAttribute('drag', '');

        // 如果当前 ui-drag-area 面板没有 hoving 属性，说明不接受此类型的 drop
        // @ts-ignore
        if (!this.$parent.$el.hasAttribute('hoving')) {
            return;
        }

        if (node.invalid) { // 不可用节点，比如 uuid 不存在
            return;
        }

        // 尾部结束时重新选中的节点，默认为 drop 节点
        let selectId = node.uuid;

        // @ts-ignore
        const dragData = event.dataTransfer.getData('dragData');
        let data: IdragNode;
        if (dragData === '') {
            // @ts-ignore
            data = {};
        } else {
            data = JSON.parse(dragData);
        }

        if (node.uuid !== data.from) {  // 如果移动到自身节点，则不需要移动
            data.to = node.uuid; // 被瞄准的节点
            data.insert = insert; // 在重新排序前获取数据

            // @ts-ignore
            this.$emit('drop', data);

            // 重新选中被移动的节点
            selectId = data.from;
        }

        // @ts-ignore
        this.singleSelect(selectId);
    }
};

export function mounted() {
    // @ts-ignore
    const node = this.node;
    if (node.state !== '' || node.invalid) {
        // @ts-ignore
        this.draggable = false;
    }
}
