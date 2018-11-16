'use strict';

let $scene: any = null;
let $loading: any = null;
let $path: any = null;

export function init(element: any) {
    $scene = element.$.scene;
    $loading = element.$.loading;
    $path = element.$.path;
}

/**
 * 场景所有对外提供的操作消息接口
 */
export function apply(messages: any) {
    /**
     * 查询一个节点的 dump 数据
     */
    messages['query-node'] = async (uuid: string) => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Node', 'queryDump', [uuid]);
    };

    /**
     * 查询某个节点的路径信息
     * 相对于场景的 path 搜索路径
     */
    messages['query-node-path'] = async (uuid: string) => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Scene', 'queryNodePath', [uuid]);
    };

    /**
     * 查询当前场景的节点树信息
     */
    messages['query-node-tree'] = async () => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Scene', 'queryNodeTree');
    };

    /**
     * 查询一个节点内挂载的所有组件以及对应的函数
     */
    messages['query-component-function-of-node'] = async (uuid: string) => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Node', 'queryComponentFunctionOfNode', [uuid]);
    };

}
