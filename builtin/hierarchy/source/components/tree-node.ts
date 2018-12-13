'use strict';
import { readFileSync } from 'fs';
import { join } from 'path';

const context = require('./tree-node-context');

export const name = 'tree-node';

export const template = readFileSync(
    join(__dirname, '../../static/template/tree-node.html'),
    'utf8'
);

export const props: string[] = [
    'node',
    'selects',
    'renameUuid',
];

export function data() {
    return {};
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
            // @ts-ignore 选中该节点，即更新了属性检查器
            this.$emit('ipcSingleSelect', node.uuid);

            // @ts-ignore
            this.inputFocus();
            return 'input';
        }

        return node.state;
    },
    draggable() {
        // @ts-ignore
        const node = this.node;

        // @ts-ignore
        if (this.state !== '' || node.readOnly) {
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
        if (this.state === 'input') {
            // @ts-ignore
            this.inputFocus();
        }
    },
};

export const methods = {
    /**
     * rename 情况下 input 的获得焦点且选中文字
     */
    inputFocus() {
        // @ts-ignore
        this.$nextTick(() => {
            // @ts-ignore
            this.$refs.input.focus();
            // @ts-ignore
            this.$refs.input.setSelectionRange(0, this.node.name.length);
        });
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

        if (node.readOnly) {
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
        event.dataTransfer.setData('dragData', JSON.stringify({
            from: uuid,
            type: 'cc.Node',
        }));
        // @ts-ignore 给其他面板使用
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
        }

        if (node.readOnly) { // 不可用节点，比如 uuid 不存在
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
