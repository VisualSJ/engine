'use strict';

let pkg: any = null;
let expand: string = ''; // 记录展开，其他默认折叠
const profile = Editor.Profile.load('profile://local/packages/hierarchy.json');

export const messages = {
    open() {
        Editor.Panel.open('hierarchy');
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
     * 编辑器配置默认节点折叠状态：
     * 全部展开：expand_all
     * 全部折叠：collapse_all
     */
    async 'query-staging-fold'() {
        if (!expand) {
            const setting = await Editor.Ipc.requestToPackage('preferences', 'get-setting', 'general.node_tree');

            switch (setting) {
                case 'collapse_all': expand = 'false'; break;
                case 'expand_all': expand = 'true'; break;
                default: expand = profile.get('expand') || '[]'; break;
            }
        }

        return expand;
    },
};

export function load() {
    // @ts-ignore
    pkg = this;
}

export function unload() {}
