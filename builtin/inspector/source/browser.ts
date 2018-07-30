'use strict';

let pkg: any = null;

export const messages = {
    open () {
        Editor.Panel.open('inspector');
    },
};

export function load () {
    // @ts-ignore
    pkg = this;
};

export function unload () {};
