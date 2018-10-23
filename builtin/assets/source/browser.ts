'use stirct';

let pkg: any = null;
let fold: string[] = [];

export const messages = {
    /**
     * 打开资源管理器面板
     */
    open() {
        Editor.Panel.open('assets');
    },

    /**
     * 暂存折叠数据
     */
    'staging-fold'(uuids: string[] = []) {
        fold = uuids;
    },

    /**
     * 查询暂存的折叠数据
     */
    'query-staging-fold'(): string[] {
        return fold;
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {}
