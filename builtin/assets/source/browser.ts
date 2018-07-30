'use strict';

let pkg: any = null;

export const messages = {
    open () {
        Editor.Panel.open('assets');
    },
};

export function load () {
    // @ts-ignore
    pkg = this;
};

export function unload () {};
