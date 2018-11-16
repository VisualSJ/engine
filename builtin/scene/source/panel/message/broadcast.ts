'use strict';

const profile = Editor.Profile.load(
    'profile://local/packages/scene.json'
);

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
    messages['asset-db:ready'] = () => {
        const uuid = profile.get('current-scene');
        if (!uuid) {
            return;
        }
        $scene.forwarding('Scene', 'open', [uuid]);
    };

    /**
     * 资源数据库关闭
     *   通知 webview 关闭场景
     */
    messages['asset-db:close'] = () => {
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

        selectNodeUuid = uuid;
        const path = await $scene.forwarding('Scene', 'queryNodePath', [uuid]);
        $path.innerHTML = path;

    };

    /**
     * 取消某个物体的选中状态
     *   判断是否为当前选中的节点，如果是的话，需要将显示在页面上的路径信息删除
     */
    messages['selection:select'] = (type: string, uuid: string) => {
        if (type !== 'node') {
            return;
        }

        if (selectNodeUuid !== uuid) {
            return;
        }

        selectNodeUuid = '';
        $path.innerHTML = '';
    };

    /**
     * 新建资源
     *   如果新建的是脚本，需要导入到场景内
     */
    messages['asset-db:asset-add'] = async (uuid: string) => {
        const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);

        switch (info.importer) {
            case 'javascript':
                $scene.forwarding('Script', 'loadScripts', [[uuid]]);
                break;
        }
    };

    /**
     * 修改资源广播
     *   如果修改的是脚本，需要更新场景内的脚本数据
     */
    messages['asset-db:asset-change'] = async (uuid: string) => {
        const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);

        switch (info.importer) {
            case 'javascript':
                $scene.forwarding('Script', 'loadScripts', [[uuid]]);
                break;
        }
    };

}
