'use strict';

import { V4MAPPED } from 'dns';
import { shell } from 'electron';
import { readFileSync } from 'fs';
import { join } from 'path';

export const name = 'pkg-node';

export const template = readFileSync(
    join(__dirname, '../../static/template/pkg-node.html'),
    'utf8'
);

export const props: string[] = [
    'pkg',
];

export function data() {
    return {};
}

export const methods = {
    t(key: string): string {
        // @ts-ignore
        return this.$parent.t(key);
    },
    // 启用和禁用
    async toggleEnable() {
        // @ts-ignore
        const { enable, path } = this.pkg;
        await Editor.Ipc.requestToPackage('packager', 'enable', path, !enable);

        // @ts-ignore
        this.$parent.refresh();
    },

    // 打开文件夹
    openFolder() {
        // @ts-ignore
        shell.showItemInFolder(this.pkg.path);
    },

    // 删除插件
    async remove() {
        const vm = this;
        // @ts-ignore
        const { info, path } = this.pkg;

        const code = await Editor.Dialog.show({
            title: vm.t('confirm'),
            type: 'question',
            default: 0,
            cancel: 1,
            message: `${vm.t('removeConfirm').replace('$name', info.name)}`,
        });

        if (code === 1) {
            return;
        }

        const done: boolean = await Editor.Ipc.requestToPackage('packager', 'remove', path);

        if (!done) {
            return;
        }

        // 提示删除成功
        Editor.Dialog.show({
            title: vm.t('remove'),
            type: 'info',
            message: `${info.name} ${vm.t('removeSuccess')}`,
            buttons: [],
        });
    },
};

export function mounted() { }

export async function beforeClose() { }

export async function close() { }
