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
    /**
     * 节点折叠切换
     * @param uuid 
     */
    toggleNode (uuid: string) {
        // @ts-ignore
        this.$emit('toggle', uuid);
    },
    /**
     * 节点重名命
     * @param event 
     * @param item 
     */
    renameNode (event: Event, item: ItreeNode) {
        // 改变节点状态
        item.rename = 'input';

        // @ts-ignore
        this.$nextTick(() => {
            // @ts-ignore
            this.$refs.input[0].focus();
        });
    },
    /**
     * 提交重名命
     * @param item 
     */
    renameBlur (item: ItreeNode) {
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
    dragStart (event: Event, uuid: string) {
        // @ts-ignore
        event.dataTransfer.setData('dragData', JSON.stringify({
            from: uuid
        }));
    },
    /**
     * 拖动到元素的上面
     * 一个元素仍然识别为上中下三个区域
     * @param event 
     * @param uuid 
     */
    dragOver (event: Event, uuid: string) {
        event.preventDefault(); // 阻止原生事件，这个对效果挺重要的
        // @ts-ignore
        const target: any = event.currentTarget;

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
    dragLeave (event: Event, uuid: string) {
        // @ts-ignore
        event.currentTarget.setAttribute('insert', '');
    },
    /**
     * 放开鼠标，识别为 drop 事件后回调
     * @param event 
     * @param uuid 
     */
    drop (event: Event, uuid: string) {
        event.preventDefault();
        
        // @ts-ignore
        const data = JSON.parse(event.dataTransfer.getData('dragData'));
        data.to = uuid; // 被瞄准的节点

        // @ts-ignore
        const target: any = event.currentTarget;

        data.insert = target.getAttribute('insert'); // 在重新排序前获取数据
        
        target.setAttribute('insert', ''); // 还原节点状态

       
        if (data.to === data.from) {  // 如果移动到自身节点，则不需要移动
            return false;
        }
        
        // @ts-ignore
        this.$emit('drop', data);
    }
};
