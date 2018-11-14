'use strict';

import { shell } from 'electron';
import { readFileSync } from 'fs';
import { remove } from 'fs-extra';
import { join } from 'path';
const menu = require('@base/electron-menu');
export const template = readFileSync(join(__dirname, '../../static/template/components/pkg-item.html'), 'utf8');
export function data() {
    return {};
}

export const methods = {
    /**
     * 包管理操作
     * @param {string} cmd 操作指令 reload disabled enabled
     * @param {string} path 插件路径
     * @param {string} type 插件类型
     */
    handelPkg(cmd: string, path: string, type: string) {
        Editor.Ipc.sendToPackage('pkg-manager', 'handle-packages', cmd, path, type);
    },

    // 打开文件夹
    openFolder(path: string) {
        shell.showItemInFolder(path);
    },

    // 删除插件
    removePlugin(path: string) {
        remove(path, (error) => {
            console.error(error);
        });
    },

    /**
     *  选择对应的 disable/enable 方式
     *
     * @param {*} event
     * @param {string} cmd 指令
     * @param {string} path 插件路径
     * @param {string} type 插件类型
     */
    chooseHandle(event: any, cmd: string, path: string, type: string) {
        menu.popup({
            x: event.pageX,
            y: event.pageY,
            menu: [
                {
                    label: `${cmd} in global`,
                    click() {
                        Editor.Ipc.sendToPackage('pkg-manager', 'handle-packages', cmd, path, type);
                    }
                },
                {
                    label: `${cmd} in project`,
                    click() {
                        Editor.Ipc.sendToPackage('pkg-manager', 'handle-packages', cmd, path, type, true);
                    }
                }
            ]
        });
    },
};
export const props: object = [
    'package'
];

export function mounted() {}

export async function beforeClose() {}

export async function close() {}
