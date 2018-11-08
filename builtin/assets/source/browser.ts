'use strict';

let pkg: any = null;
let fold: string = '{}';

export const messages = {
    open() {
        Editor.Panel.open('assets');
    },
    /**
     * 暂存折叠数据
     */
    'staging-fold'(jsonStr: string) {
        fold = jsonStr;
    },

    /**
     * 查询暂存的折叠数据
     */
    'query-staging-fold'(): string {
        return fold;
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() { }
