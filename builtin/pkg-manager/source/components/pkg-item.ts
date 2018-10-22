'use strict';

import { existsSync, readFileSync } from 'fs';
import { readJSONSync } from 'fs-extra';
import { join } from 'path';
export const template = readFileSync(join(__dirname, '../../static/template/components/pkg-item.html'), 'utf8');
export function data() {
    return {
        name: '',
        version: '0.0.1', // 版本号
        detail: '', // 插件描述
        author: '', // 插件作者
    };
}

export const methods = {
    /**
     * 包管理操作
     * @param {string} cmd 操作指令
     */
    handelPkg(cmd: string) {
        switch (cmd) {
            case 'reload':
                // @ts-ignore
                Editor.Package.reload(this.path);
                break;
        }
    }
};
export const props: string[] = [
    'path'
];

export function mounted() {
    // @ts-ignore
    const that = this;
    const pkgPath = join(that.path, '/package.json');
    if (!that.path || !existsSync(pkgPath)) {
        return;
    }
    const pkg = readJSONSync(pkgPath);
    that.version = pkg.version;
    that.detail = pkg.detail;
    that.author = pkg.author;
    that.name = pkg.name;
}

export async function beforeClose() {}

export async function close() {}
