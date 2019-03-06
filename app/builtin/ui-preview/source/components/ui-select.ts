'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/components/ui-select.html'), 'utf8');
export function data() {
    return {
        value:'test',
        eventName:''
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
    }
};