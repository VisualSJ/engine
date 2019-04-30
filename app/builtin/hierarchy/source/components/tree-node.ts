'use strict';
import { readFileSync } from 'fs';
import { join } from 'path';

const context = require('./tree-node-context');
const utils = require('./tree-utils');

export const name = 'tree-node';

export const template = readFileSync(
    join(__dirname, '../../static/template/tree-node.html'),
    'utf8'
);

export const props: string[] = [
    'node',
    'selects',
    'twinkles',
    'renameUuid',
    'addNode',
];

export function data() {
    return {
        renameValue: '',
        renameInputState: '',
        addInputState: '',
    };
}

export const computed = {
    // @ts-ignore
    state() {
        // @ts-ignore
        const node = this.node;

        if (!node) {
            return '';
        }

        // @ts-ignore
        if (this.renameUuid === node.uuid) {
            return 'rename';
            // @ts-ignore
        } else if (this.addNode.parent === node.uuid) {
            // @ts-ignore 选中该节点
            return 'add';
        }

        return node.state;
    },
    draggable() {
        // @ts-ignore
        const node = this.node;

        // @ts-ignore
        if (this.state !== '' || utils.canNotDragNode(node)) {
            return 'false';
        }

        return 'true';
    },
};

export const watch = {
    state() {
        // @ts-ignore
        const node = this.node;

        // @ts-ignore
        if (this.state === 'rename') {
            // @ts-ignore
            this.renameValue = node.name;
            // @ts-ignore
            this.renameInputState = '';

            // @ts-ignore
            this.$nextTick(() => {
                // @ts-ignore
                this.$refs.renameInput.focus();
                // @ts-ignore
                this.$refs.renameInput.setSelectionRange(0, node.name.length);
            });
        }

        // @ts-ignore
        if (this.state === 'add') {
            // @ts-ignore
            const { name } = this.addNode;

            // @ts-ignore
            this.addInputState = '';

            // @ts-ignore
            this.$nextTick(() => {
                // @ts-ignore
                if (this.$refs.addInput) {
                    // @ts-ignore
                    this.$refs.addInput.focus();
                    // @ts-ignore
                    this.$refs.addInput.setSelectionRange(0, name.length);
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

        context.menu(event, this, node);
    },
    /**
     * 选中某个节点
     * @param event
     * @param node
     */
    click(event: Event, node: ItreeNode) {
        // 必要的，配合父级容器的点击事件
        event.stopPropagation();

        // @ts-ignore
        if (event.ctrlKey || event.metaKey || event.shiftKey) { // 多选
            // @ts-ignore
            this.$emit('ipcMultipleSelect', event.shiftKey, node.uuid);
        } else { // 单选
            // @ts-ignore
            this.$emit('ipcSingleSelect', node.uuid);
        }
    },

    /**
     * 双击某个节点
     * @param event
     * @param node
     */
    dblclick(event: Event, node: ItreeNode) {
        // @ts-ignore
        this.$emit('ipcSingleSelect', node.uuid);
        Editor.Ipc.sendToPanel('scene', 'focus-camera', [node.uuid]);
    },

    /**
     * 节点折叠切换
     * @param uuid
     */
    toggle(event: Event, node: ItreeNode) {
        // 允许点击的元素有动画，不能直接全部放开动画是因为滚动中vue节点都会变动，导致动画都在执行
        // @ts-ignore
        const target: any = event.currentTarget;
        target.setAttribute('animate', '');
        setTimeout(() => {
            target.removeAttribute('animate');
        }, 500);

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
        node.state = 'rename';
    },
    /**
     * 改变输入值时判断是否重名
     */
    renameChange(event: Event, node: ItreeNode) {

        // @ts-ignore
        this.renameValue = this.$refs.renameInput.value.trim();
        let state = '';
        // @ts-ignore
        if (this.renameValue === '') {
            state = 'errorNewnameEmpty';
        }

        // @ts-ignore
        this.renameInputState = state;
    },
    /**
     * 提交重名命
     * @param node
     */
    renameSubmit(event: Event, node: ItreeNode) {
        // @ts-ignore; 避免两次触发
        if (this.state !== 'rename') {
            return;
        }
        // @ts-ignore
        const newName = this.$refs.renameInput.value.trim();
        // @ts-ignore
        this.$emit('rename', node.uuid, newName);
    },
    /**
     * 取消重名命
     * @param node
     */
    renameCancel(event: Event, node: ItreeNode) {
        // @ts-ignore
        this.$emit('rename', node.uuid, '');
    },
    /**
     * 改变输入值时判断是否重名
     */
    addChange(event: Event) {
        // @ts-ignore
        const { addNode } = this;
        // @ts-ignore
        addNode.name = this.$refs.addInput.value.trim();
        let state = '';
        // @ts-ignore
        if (addNode.name === '') {
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
        // @ts-ignore 避免两次触发
        if (this.state !== 'add') {
            return;
        }
        // @ts-ignore
        const json: IaddNode = Object.assign({}, this.addNode);
        // @ts-ignore
        const newName = this.$refs.addInput.value.trim();
        // @ts-ignore
        if (newName === '') {
            // @ts-ignore
            this.$emit('addConfirm', null);
            return;
        }

        json.name = newName;
        // @ts-ignore
        json.parent = this.node.uuid;
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
    dragStart(event: Event, node: ItreeNode) {
        const uuid = node.uuid;
        // @ts-ignore
        const values: any[] = []; // 支持多选时数据填充
        // @ts-ignore
        if (this.selects.includes(uuid)) {
            // @ts-ignore
            this.selects.forEach((id: string) => {
                const selected = utils.getNodeFromTree(id);
                values.push({ type: selected.type, value: selected.uuid });
            });
        } else {
            values.push({ type: node.type, value: uuid });
        }
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({
            from: uuid,
            type: node.type,
            values, // 需要判断是否多选时，取该数据
        }));
        // @ts-ignore
        event.dataTransfer.setData('value', uuid);

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
    dragOver(event: any, node: ItreeNode) {
        event.preventDefault(); // 阻止原生事件，这个对效果挺重要的

        // @ts-ignore
        if (
            !event.dataTransfer ||
            (event.dataTransfer.types.length === 1 && event.dataTransfer.types[0] === 'value')
        ) {
            // @ts-ignore
            if (!this.selects.includes(node.uuid)) {
                // @ts-ignore
                this.$emit('ipcSingleSelect', node.uuid);
            }

            return;
        }

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

        if (node.readonly) { // 不可用节点，比如 uuid 不存在
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
        data.copy = event.ctrlKey;
        // @ts-ignore
        this.$emit('ipcDrop', data);
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

}
