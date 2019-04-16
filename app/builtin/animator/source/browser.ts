'use strict';

let pkg: any = null;

/**
 * 打开 animator 面板
 */
export const messages = {
    open() {
        Editor.Panel.open('animator');
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {}
