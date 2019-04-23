'use strict';

let $scene: any = null;
let $loading: any = null;

export function init(element: any) {
    $scene = element.$.scene;
    $loading = element.$.loading;
}

/**
 * 场景所有对外提供的操作消息接口
 */
export function apply(messages: any) {
    /**
     * 打开场景的调试工具
     */
    messages['generate-prefab'] = async (uuid: string) => {
        if (!$scene) {
            return null;
        }
        const json = await $scene.forwarding('Prefab', 'generate', [
            uuid,
        ]);

        return json;
    };

    /**
     * 链接一个节点和一个资源
     */
    messages['link-prefab'] = async (nodeUuid: string, assetUuid: string) => {
        if (!$scene) {
            return null;
        }
        const json = await $scene.forwarding('Prefab', 'link', [
            nodeUuid, assetUuid,
        ]);

        return json;
    };

    /**
     * 解除一个节点和 prefab 资源的链接
     */
    messages['unlink-prefab'] = async (nodeUuid: string) => {
        if (!$scene) {
            return null;
        }
        const json = await $scene.forwarding('Prefab', 'unlink', [
            nodeUuid,
        ]);

        return json;
    };
}
