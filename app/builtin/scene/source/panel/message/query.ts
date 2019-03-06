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
 * 场景所有对外提供的操作消息接口
 */
export function apply(messages: any) {
    /**
     * 查询当前场景是否准备就绪
     */
    messages['query-is-ready'] = async () => {
        return $loading.hidden;
    };

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
     * 查询一个组件的 dump 数据
     */
    messages['query-component'] = async (uuid: string) => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Component', 'queryDump', [uuid]);
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
    messages['query-node-tree'] = async (uuid: string) => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Scene', 'queryNodeTree', [uuid]);
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

    /**
     * 查询所有内置 Effects
     */
    messages['query-all-effects'] = async () => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Asset', 'queryAllEffects');
    };

    messages['query-material'] = async (uuid: string, effectName: string) => {
        return await $scene.forwarding('Asset', 'queryMaterial', [uuid, effectName]);
    };

    /**
     * 根据 effecName 构建指定 Effect 的 props 和 defines 属性
     */
    messages['query-effect'] = async (effectName: string) => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Asset', 'queryEffect', [effectName]);
    };

    /**
     * 返回根据给定属性创建完整的 material 系列化数据
     */
    messages['query-serialized-material'] = async (uuid: string) => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Asset', 'querySerializedMaterial', [uuid]);
    };

    /**
     * 查询当前场景的序列化数据
     */
    messages['query-scene-json'] = async () => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Scene', 'serialize');
    };

    /**
     * 查询当前显示的场景
     */
    messages['query-current-scene'] = async () => {
        const uuid = profile.get('current-scene');
        return uuid || '';
    };

    /**
     * 查询当前场景是否被修改
     */
    messages['query-dirty'] = async () => {
        return await $scene.forceForwarding('Scene', 'queryDirty');
    };

    /**
     * 查询当前 gizmo 工具的名字
     */
    messages['query-gizmo-tool-name'] = async () => {
        return await $scene.forceForwarding('Gizmo', 'queryToolName');
    };

    /**
     * 查询 gizmo 中心点类型
     */
    messages['query-gizmo-pivot'] = async () => {
        return await $scene.forceForwarding('Gizmo', 'queryPivot');
    };

    /**
     * 查询 gizmo 坐标类型
     */
    messages['query-gizmo-coordinate'] = async () => {
        return await $scene.forceForwarding('Gizmo', 'queryCoordinate');
    };

    /**
     * 查询 是否处于2D编辑模式
     */
    messages['query-is2D'] = async () => {
        return await $scene.forceForwarding('Gizmo', 'queryIs2D');
    };

    messages['query-components'] = async () => {
        return await $scene.forceForwarding('Scene', 'queryComponents');
    };

    messages['query-preview-info'] = async () => {
        const cameras = await $scene.forwarding('Preview', 'queryCameraList');
        return {
            id: $scene.$scene.getWebContents().id,
            cameras,
        };
    };
}
