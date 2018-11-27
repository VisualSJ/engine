'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';
export const template = readFileSync(join(__dirname, '../../static/template/components/web-desktop.html'), 'utf8');
export function data() {
    return {};
}

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string) {
        const name = `build.${key}`;
        return Editor.I18n.t(name);
    },
};
export const props: object = [
    // 'package'
];

export function mounted() {}

export async function beforeClose() {}

export async function close() {}
