'use strict';
import { existsSync, outputFileSync, readFileSync } from 'fs-extra';
import { join } from 'path';

const profile = Editor.Profile.load('profile://local/packages/assets.json');

let expand: string = ''; // 记录展开，其他默认折叠
let sort: string = ''; // 记录排序方式

export const messages = {
    open() {
        Editor.Panel.open('assets');
    },
    /**
     * 暂存数据：
     * 节点折叠状态，字段 expand
     * 排序方式，字段 sort
     */
    staging(json: any) {
        expand = json.expand;
        sort = json.sort;

        profile.set('expand', expand);
        profile.set('sort', sort);
        profile.save();
    },

    /**
     * 查询暂存的折叠数据
     * 编辑器配置默认节点折叠状态：
     * 全部展开：expand_all ,全部折叠：collapse_all
     * 排序方式：sort 为 'name' 或 'ext'
     */
    async 'query-staging'() {
        if (!expand) {
            const setting = await Editor.Ipc.requestToPackage('preferences', 'get-setting', 'general.node_tree');

            switch (setting) {
                case 'collapse_all': expand = 'false'; break;
                case 'expand_all': expand = 'true'; break;
                default: expand = profile.get('expand') || '[]'; break;
            }
        }

        if (!sort) {
            sort = profile.get('sort') || 'name';
        }

        return {expand, sort};
    },
};

export function load() {
    // @ts-ignore

}

export function unload() { }
