'use strict';
import { existsSync, outputFileSync, readFileSync } from 'fs-extra';
import { join } from 'path';

let pkg: any = null;
let expand: string = ''; // 记录展开，其他默认折叠
const profile = Editor.Profile.load('profile://local/packages/assets.json');

export const messages = {
    open() {
        Editor.Panel.open('assets');
    },
    /**
     * 暂存折叠数据
     */
    'staging-fold'(jsonStr: string) {
        expand = jsonStr;

        profile.set('expand', jsonStr);
        profile.save();
    },

    /**
     * 查询暂存的折叠数据
     */
    'query-staging-fold'(): string {
        if (!expand) {
            expand = profile.get('expand') || '[]';
        }

        return expand;
    },
};

export function load() {
    // @ts-ignore
    pkg = this;

}

export function unload() { }
