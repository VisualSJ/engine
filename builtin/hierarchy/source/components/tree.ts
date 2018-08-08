'use strict';

import { readFileSync } from 'fs';
import { join, extname } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/tree.html'), 'utf8');

export const props: string[] = [
    'list',
    'select',
];

export const name = 'tree';

export function data() {
    return {};
};

export const methods = {
    /**
     * 选中某个节点
     * @param event 
     * @param uuid 
     */
    selectNode(event: Event, uuid: string) {
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
        Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
    },
    toggleNode(uuid: string) {
        // @ts-ignore
        this.$emit('toggle', uuid);
    },
    dragStart(event: Event, uuid: string) {
        // @ts-ignore
        event.dataTransfer.setData("dragData", JSON.stringify({
            // 只能传字符，所以用了.stringify
            from: uuid
        }));
    },
    dragOver(event: Event, uuid: string) {
        event.preventDefault();
        // @ts-ignore
        let target: any = event.currentTarget;

        let offset = target.getBoundingClientRect();
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
    dragLeave(event: Event, uuid: string) {
        // @ts-ignore
        event.currentTarget.setAttribute('insert', '');
    },
    drop(event: Event, uuid: string) {
        event.preventDefault();
        // @ts-ignore
        let target: any = event.currentTarget;
        // @ts-ignore
        let data = JSON.parse(event.dataTransfer.getData("dragData"));
        // 
        data.to = uuid;
        // 在重新排序前获取数据
        data.insert = target.getAttribute('insert');
        // 还原节点状态
        target.setAttribute('insert', '');
        // @ts-ignore
        this.$emit('drop', data);
    }
};