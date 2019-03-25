'use strict';

const profile = {
    default: Editor.Profile.load('profile://default/packages/hierarchy.json'),
    global: Editor.Profile.load('profile://global/packages/hierarchy.json'),
    local: Editor.Profile.load('profile://local/packages/hierarchy.json'),
};

export const messages = {
    'get-config'(position: string, key: string) {
        if (position !== 'local' && position !== 'global') {
            return;
        }
        return profile[position].get(key);
    },
    'set-config'(position: string, key: string, value: any) {
        if (position !== 'local' && position !== 'global') {
            return;
        }

        profile[position].set(key, value);
        profile[position].save();
    },
    open() {
        Editor.Panel.open('hierarchy');
    },
    /**
     * 暂存折叠数据
     * 折叠状态，字段 expand
     */
    staging(json: string) {
        profile.local.set('state', json);
        profile.local.save();
    },

    /**
     * 查询暂存的折叠数据
     * 编辑器配置默认节点折叠状态：
     * 全部展开：expand_all
     * 全部折叠：collapse_all
     */
    async 'query-staging'() {
        return profile.local.get('state');
    },
};

export function load() {
    // 设置默认的 profile
    profile.default.set('state', {
        use_global: true,
        expand: false,
    });
}

export function unload() {}
