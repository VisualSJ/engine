'use strict';

let pkg: any = null;

/**
 * 打开 package-manager 面板
 */
export const messages = {
    open() {
        Editor.Panel.open('package-manager');
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {

}
