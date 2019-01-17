'use strict';

let pkg: any = null;

export const messages = {
    /**
     * 打开属性检查器面板
     */
    open() {
        Editor.Panel.open('inspector');
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {}
