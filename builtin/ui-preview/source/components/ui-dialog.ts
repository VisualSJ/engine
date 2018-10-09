'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
export const template = readFileSync(join(__dirname, '../../static/template/components/ui-dialog.html'), 'utf8');
export function data() {
    return {};
}

export const methods = {
    /**
     * 测试打开弹框
     */
    async show(arg: string) {
        const config: any = {
            title: 'title',
            message: 'message',
            detail: 'detail',
        };
        switch (arg) {
            case 'info':
                config.type = 'info';
                break;
            case 'warn':
                config.type = 'warn';
                break;
            case 'error':
                config.type = 'error';
                break;
            case 'buttons':
                config.buttons = ['a', 'b', 'c', 'd'];
                break;
        }

        const code = await Editor.Dialog.show(config);
        console.log(code);
    },

    /**
     * 打开文件
     * @param type
     */
    async openFile(type: string) {
        const config: any = {};

        switch (type) {
            case 'root':
                config.root = __dirname;
                break;
            case 'filters':
                config.filters = [
                    {name: 'Images', extensions: ['jpg', 'png', 'gif']},
                ];
                break;
        }

        const data = await Editor.Dialog.openFile(config);
        console.log(data);
    },

    /**
     * 打开文件夹
     */
    async openDirectory() {
        const config: any = {};
        const data = await Editor.Dialog.openDirectory(config);
        console.log(data);
    },

    /**
     * 保存文件
     * @param type
     */
    async save(type: string) {
        const config: any = {};

        switch (type) {
            case 'root':
                config.root = __dirname;
                break;
        }

        const data = await Editor.Dialog.saveFile(config);
        console.log(data);
    }
};

export async function beforeClose() { }

export async function close() { }
