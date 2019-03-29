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
     * 安装依赖
     */
    messages['asset-db:ready'] = (...args: any[]) => {
        $scene.depend.finish('asset-db-ready');
    };

    /**
     * 资源数据库关闭
     * 卸载依赖
     */
    messages['asset-db:close'] = () => {
        $scene.depend.reset('asset-db-ready');
        // $scene.forwarding('Scene', 'close');
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
                $scene.forwarding('Script', 'loadScript', [uuid]);
                break;
            case 'effect':
                $scene.forwarding('Effect', 'registerEffects', [[uuid]]);
            default:
                $scene.forwarding('Asset', 'assetChange', [uuid]);
                break;
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
                $scene.forwarding('Script', 'loadScript', [uuid]);
                break;
            case 'effect':
                $scene.forwarding('Effect', 'registerEffects', [[uuid]]);
            default:
                $scene.forwarding('Asset', 'assetChange', [uuid]);
                break;
        }
    };

    /**
     * 刪除资源广播
     */
    messages['asset-db:asset-delete'] = (uuid: string, info: any) => {
        switch (info.importer) {
            case 'javascript':
            // 如果修改的是脚本，需要更新场景内的脚本数据
            $scene.forwarding('Script', 'removeScript', [info]);
            break;
        case 'effect':
            // 如果删除的是 effect，需要通知更新 effect 列表
            $scene.forwarding('Effect', 'removeEffects', [[uuid]]);
        default:
            $scene.forwarding('Asset', 'assetDelete', [uuid]);
            break;
        }
    };
}
