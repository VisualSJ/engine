'use strict';

let pkg: any = null;

/**
 * 打开 ui-preview 面板
 */
export const messages = {
    open() {
        Editor.Panel.open('ui-preview');
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {}
