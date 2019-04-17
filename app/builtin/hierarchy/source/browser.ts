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

    /**
     * 关联节点到预制
     */
    async 'link-prefab'() {
        const nodeUuid = Editor.Selection.getLastSelected('node');
        const assetUuid = Editor.Selection.getLastSelected('asset');

        let error = '';

        if (!nodeUuid) {
            error = Editor.I18n.t('hierarchy.menu.link_prefab_error_node_empty');
        } else {
            const nodeDump = await Editor.Ipc.requestToPackage('scene', 'query-node', nodeUuid);
            if (nodeDump.isScene) {
                error = Editor.I18n.t('hierarchy.menu.link_prefab_error_node_isScene');
            }
        }

        if (!assetUuid) {
            error = Editor.I18n.t('hierarchy.menu.link_prefab_error_asset_empty');
        } else {
            const assetInfo = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', assetUuid);
            if (assetInfo.importer !== 'prefab') {
                error = Editor.I18n.t('hierarchy.menu.link_prefab_error_asset_invalid');
            }
        }

        if (error) {
            return await Editor.Dialog.show({
                type: 'warning',
                buttons: ['Cancel'],
                title: Editor.I18n.t('hierarchy.operate.dialogWaining'),
                message: error,
            });
        }

        await Editor.Ipc.requestToPanel('scene', 'snapshot');
        await Editor.Ipc.requestToPackage('scene', 'link-prefab', nodeUuid, assetUuid);

    },

    /**
     * 还原为普通节点
     */
    async 'unlink-prefab'() {
        const nodeUuid = Editor.Selection.getLastSelected('node');

        let error = '';

        if (!nodeUuid) {
            error = Editor.I18n.t('hierarchy.menu.unlink_prefab_error_prefab_empty');
        } else {
            const nodeDump = await Editor.Ipc.requestToPackage('scene', 'query-node', nodeUuid);
            if (!nodeDump.__prefab__) {
                error = Editor.I18n.t('hierarchy.menu.unlink_prefab_error_prefab_empty');
            }
        }

        if (error) {
            return await Editor.Dialog.show({
                type: 'warning',
                buttons: ['Cancel'],
                title: Editor.I18n.t('hierarchy.operate.dialogWaining'),
                message: error,
            });
        }

        await Editor.Ipc.requestToPanel('scene', 'snapshot');
        await Editor.Ipc.requestToPackage('scene', 'unlink-prefab', nodeUuid);
    },

};

export function load() {
    // 设置默认的 profile
    profile.default.set('state', {
        use_global: true,
        expand: false,
    });
}

export function unload() { }
