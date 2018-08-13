'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/tree.html'), 'utf8');

export const props: string[] = [
    'list',
    'select',
];

export const name = 'tree';

export function data () {
    return {};
}

export const methods = {
    /**
     * 选中某个节点
     * @param event
     * @param uuid
     */
    selectNode (event: Event, uuid: string) {
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
        Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
    },
    toggleNode (uuid: string) {
        // @ts-ignore
        this.$emit('toggle', uuid);
    },
    renameNode (event: Event, item: any) {
        // 重名命节点
        // 暂时先绑定在双击事件上
        item.rename = true;
        // @ts-ignore
        this.$nextTick(() => {
            // @ts-ignore
            this.$refs.input[0].focus();
        });

    },
    renameBlur (uuid: string) {
        // @ts-ignore
        const newName = this.$refs.input[0].value.trim();

        // 正式提交重名命
        // @ts-ignore
        this.$emit('rename', uuid, newName);
    },
    dragStart (event: Event, uuid: string) {
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({
            // 只能传字符，所以用了.stringify
            from: uuid
        }));
    },
    dragOver (event: Event, uuid: string) {
        event.preventDefault();
        // @ts-ignore
        const target: any = event.currentTarget;

        const offset = target.getBoundingClientRect();
        // @ts-ignore
        if (event.clientY - offset.top <= 4) {
            // 偏上的位置
            target.setAttribute('insert', 'before');
            // @ts-ignore
        } else if (offset.bottom - event.clientY <= 4) {
            // 偏下
            target.setAttribute('insert', 'after');
        } else {
            // 中间位置
            target.setAttribute('insert', 'inside');
        }
    },
    dragLeave (event: Event, uuid: string) {
        // @ts-ignore
        event.currentTarget.setAttribute('insert', '');
    },
    drop (event: Event, uuid: string) {
        event.preventDefault();
        // @ts-ignore
        const target: any = event.currentTarget;
        // @ts-ignore
        const data = JSON.parse(event.dataTransfer.getData('dragData'));
        // 被瞄准的节点
        data.to = uuid;

        // 在重新排序前获取数据
        data.insert = target.getAttribute('insert');
        // 还原节点状态
        target.setAttribute('insert', '');

        // 如果移动到自身节点，则不需要移动
        if (data.to === data.from) {
            return false;
        }
        // @ts-ignore
        this.$emit('drop', data);
    }
};
