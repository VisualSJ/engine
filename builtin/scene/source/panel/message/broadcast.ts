'use strict';

const profile = Editor.Profile.load('profile://local/packages/scene.json');

let $scene: any = null;
let $loading: any = null;
let $path: any = null;

export function init(element: any) {
    $scene = element.$.scene;
    $loading = element.$.loading;
    $path = element.$.path;
}

/**
 * 场景正在监听的所有广播消息
 */
export function apply(messages: any) {
    // 记录当前选中的节点的 uuid
    let selectNodeUuid = '';

    /**
     * 场景准备就绪
     *   隐藏菊花标
     */
    messages['scene:ready'] = () => {
        $loading.hidden = true;
    };

    /**
     * 场景关闭
     *   显示菊花标
     */
    messages['scene:close'] = () => {
        $loading.hidden = false;
    };

    /**
     * 资源数据库就绪
     *   检查最后打开的一个场景 uuid
     *   通知 webview 打开最后打开的这个 uuid
     */
    messages['asset-db:ready'] = (...args: any[]) => {
        $scene.removeDependence('asset-db');
        const uuid = profile.get('current-scene');
        // uuid 不存在，或者已经打开了场景的情况下，不需要重新打开场景
        if (!uuid && !$loading.hidden) {
            return;
        }
        $scene.forwarding('Scene', 'open', [uuid]);
    };

    /**
     * 资源数据库关闭
     *   通知 webview 关闭场景
     */
    messages['asset-db:close'] = () => {
        $scene.addDependence('asset-db');
        $scene.forwarding('Scene', 'close');
    };

    /**
     * 选中某个物体
     *   判断选中的是否为节点
     *   向 webview 查询当前节点的搜索路径并显示到页面上
     */
    messages['selection:select'] = async (type: string, uuid: string) => {
        if (type !== 'node') {
            return;
        }

        // 通知场景这个节点在编辑器内被选中了
        $scene.forwarding('Selection', '_select', [uuid]);

        // 显示搜索路径
        selectNodeUuid = uuid;
        const path = await $scene.forwarding('Scene', 'queryNodePath', [uuid]);
        $path.innerHTML = path;
    };

    /**
     * 取消某个物体的选中状态
     *   判断是否为当前选中的节点，如果是的话，需要将显示在页面上的路径信息删除
     */
    messages['selection:unselect'] = (type: string, uuid: string) => {
        if (type !== 'node') {
            return;
        }

        // 通知场景这个节点在编辑器内被选中了
        $scene.forwarding('Selection', '_unselect', [uuid]);

        // 清空显示的搜索路径
        if (selectNodeUuid !== uuid) {
            return;
        }
        selectNodeUuid = '';
        $path.innerHTML = '';
    };

    /**
     * 新建资源
     */
    messages['asset-db:asset-add'] = async (uuid: string) => {
        const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);

        switch (info.importer) {
            case 'javascript':
                // 如果新建的是脚本，需要导入到场景内
                $scene.forwarding('Script', 'loadScripts', [[uuid]]);
                break;
            case 'effect':
                $scene.forwarding('Effect', 'registerEffects', [[uuid]]);
        }
    };

    /**
     * 修改资源广播
     */
    messages['asset-db:asset-change'] = async (uuid: string) => {
        const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);

        switch (info.importer) {
            case 'javascript':
                // 如果修改的是脚本，需要更新场景内的脚本数据
                $scene.forwarding('Script', 'loadScripts', [[uuid]]);
                break;
            case 'effect':
                $scene.forwarding('Effect', 'registerEffects', [[uuid]]);
                break;
            case 'material':
                // todo 按需刷新
                $scene.forwarding('Scene', 'softReload');
                break;
            default:
                break;
        }
    };

    /**
     * 刪除资源广播
     */
    messages['asset-db:asset-delete'] = (uuid: string) => {
        // 如果删除的是 effect，需要通知更新 effect 列表
        $scene.forwarding('Effect', 'removeEffects', [[uuid]]);
    };
}
