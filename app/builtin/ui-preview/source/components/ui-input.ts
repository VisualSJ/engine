'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/components/ui-input.html'), 'utf8');
export function data() {
    return {
        value: 'test',
        eventList: [],
        newItems: [], // 新增元素
        itemHtmls: ''
    };
}

export const methods = {
    /**
     * 测试元素的confirm监听事件
     * @param event
     */
    confirmValue(event: Event) {
        // @ts-ignore
        this.eventList.push('confirm');
        setTimeout(() => {
            // @ts-ignore
            this.eventList.shift();
        }, 400);
        // @ts-ignore
        this.value = event.target.value;
    },

    /**
     * 测试元素的change监听事件
     * @param event
     */
    changeValue(event: Event) {
        // @ts-ignore
        this.eventList.push('change');
        setTimeout(() => {
            // @ts-ignore
            this.eventList.shift();
        }, 400);
        // @ts-ignore
        this.value = event.target.value;

        // @ts-ignore
        console.log(this.value);
    },

    /**
     * 测试元素的cancel监听事件
     * @param event
     */
    cancelValue(event: Event) {
        // @ts-ignore
        this.eventList.push('cancel');
        setTimeout(() => {
            // @ts-ignore
            this.eventList.shift();
        }, 400);
        // @ts-ignore
        this.value = event.target.value;

        // @ts-ignore
        console.log(this.value);
    },

    /**
     * 测试添加元素后事件等等是否会出现异常
     */
    addItem() {
        // @ts-ignore
        this.newItems.push(`<ui-input value='test'></ui-input>`);
        // @ts-ignore
        this.itemHtmls = this.newItems.toString().replace(/,/g, '');
    },

    /**
     * 测试移除元素后事件等等是否会出现异常
     */
    removeItem() {
        // @ts-ignore
        this.newItems.pop();
        // @ts-ignore
        this.itemHtmls = this.newItems.toString().replace(/,/g, '');
    }
};
