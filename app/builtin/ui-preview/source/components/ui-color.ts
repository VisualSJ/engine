'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/components/ui-color.html'), 'utf8');
export function data() {
    return {
        value:'#ccc',
        eventName:'',
        newItems:[], // 新增元素
        itemHtmls:''
    };
}

export const methods = {
    /**
     * 测试元素的confirm监听事件
     * @param event 
     */
    confirmValue(event:Event) {
        // @ts-ignore
        this.eventName = 'confirm';
        // @ts-ignore
        this.value = event.target.value;
    },

    /**
     * 测试元素的change监听事件
     * @param event 
     */
    changeValue(event:Event) {
        // @ts-ignore
        this.eventName = 'change';
        // @ts-ignore
        this.value = event.target.value;
    },
    
    /**
     * 测试元素的cancel监听事件
     * @param event 
     */
    cancelValue(event:Event) {
        // @ts-ignore
        this.eventName = 'cancel';
        // @ts-ignore
        this.value = event.target.value;
    },

    /**
     * 测试添加元素后事件等等是否会出现异常
     */
    addItem() {
        // @ts-ignore
        this.newItems.push(`<ui-color value='#ccc'></ui-color>`);
        // @ts-ignore
        this.itemHtmls = this.newItems.toString().replace(/,/g,'')
    },

    /**
     * 测试移除元素后事件等等是否会出现异常
     */
    removeItem() {
        // @ts-ignore
        this.newItems.pop();
        // @ts-ignore
        this.itemHtmls = this.newItems.toString().replace(/,/g,'');
    }
};