'use strict';

import { outputFile } from 'fs-extra';

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
     * 打开场景的调试工具
     */
    messages['open-devtools'] = () => {
        if (!$scene) {
            return null;
        }
        $scene.$scene.openDevTools();
    };

    /**
     * 打开某个场景
     *   通知 webview 打开场景
     *   记录当前打开的场景 uuid
     */
    messages['open-scene'] = async (uuid: string) => {
        if (!$scene) {
            return '';
        }
        uuid = uuid || '';
        await $scene.forwarding('Scene', 'open', [uuid]);
        profile.set('current-scene', uuid);
        profile.save();
        return uuid || '';
    };

    /**
     * 保存某个场景
     *   从 webview 拿到当前场景的序列化数据
     *   如果打开的是一个场景资源，则存储到这个资源上
     *   如果打开的是一个空场景，则提示询问保存到哪里
     */
    messages['save-scene'] = async () => {
        if (!$scene) {
            return '';
        }
        const text = await $scene.forwarding('Scene', 'serialize');
        const uuid = profile.get('current-scene') || '';

        const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
        if (asset) {
            await outputFile(asset.file, text);
            // 同步一下缓存数据
            await $scene.forwarding('Scene', 'syncSceneData');
            console.log(`Save scene: ${asset.source}`);
            return '';
        }

        const url = await Editor.Ipc.requestToPackage(
            'asset-db',
            'generate-available-url',
            'db://assets/New Scene.fire'
        );
        const newUUID = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, text);

        // 同步一下缓存数据
        await $scene.forwarding('Scene', 'syncSceneData');

        profile.set('current-scene', newUUID);
        profile.save();
        console.log(`Save scene: ${url}`);

        return uuid;
    };

    /**
     * 关闭当前场景
     *   通知 webview 关闭场景
     *   清除之前记录的场景 uuid
     */
    messages['close-scene'] = async () => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Scene', 'close');
    };

    /**
     * 设置某个元素内的属性
     */
    messages['set-property'] = async (options: SetPropertyOptions) => {
        if (!$scene) {
            return null;
        }
        return await $scene.forwarding('Node', 'setProperty', [options.uuid, options.path, options.dump]);
    };

    /**
     * 插入一个 item 到某个数组类型的 property 内
     */
    // messages['insert-array-element'] = async (options: InsertArrayOptions) => {
    //     await $scene.forwarding('Scene', 'insertArrayElement', [
    //         options.uuid,
    //         options.path,
    //         options.key,
    //         options.index,
    //         options.dump,
    //     ]);
    // };

    /**
     * 移动数组类型 property 内的某个 item 的位置
     */
    messages['move-array-element'] = async (options: MoveArrayOptions) => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Node', 'moveArrayElement', [
            options.uuid,
            options.path,
            options.target,
            options.offset,
        ]);
    };

    /**
     * 删除数组类型 property 内的某个 item 的位置
     */
    messages['remove-array-element'] = async (options: RemoveArrayOptions) => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Node', 'removeArrayElement', [options.uuid, options.path, options.index]);
    };

    /**
     * 创建一个新的节点
     */
    messages['create-node'] = async (options: CreateNodeOptions) => {
        if (!$scene) {
            return null;
        }

        if (options.assetUuid) {
            return await $scene.forwarding('Node', 'createNodeFromAsset', [options.parent, options.assetUuid]);
        }

        // 返回 uuid
        return await $scene.forwarding('Node', 'createNode', [options.parent, options.name, options.dump]);
    };

    /**
     * 删除一个节点
     */
    messages['remove-node'] = async (options: RemoveNodeOptions) => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Node', 'removeNode', [options.uuid]);
    };

    /**
     * 在某个节点上创建一个组件
     */
    messages['create-component'] = async (options: CreateComponentOptions) => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Node', 'createComponent', [options.uuid, options.component]);
    };

    /**
     * 删除某个节点上的某个组件
     */
    messages['remove-component'] = async (options: RemoveComponentOptions) => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Node', 'removeComponent', [options.uuid, options.component]);
    };

    /**
     * 执行 entity 上指定组件的方法
     */
    // messages['excute-component-method'] = async (options: ExcuteComponentMethodOptions) => {
    //     return await $scene.forwarding('Node', 'excuteComponentMethod', [
    //         options.uuid,
    //         options.index,
    //         ...options.methodNames,
    //     ]);
    // };

    /**
     * 保存一次操作记录
     */
    messages.snapshot = async () => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('History', 'snapshot');
    };

    /**
     * 撤销一次操作记录
     */
    messages.undo = async () => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('History', 'undo');
    };

    /**
     * 重做一次操作记录
     */
    messages.redo = async () => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('History', 'redo');
    };

    messages['soft-reload'] = async () => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Scene', 'softReload');
    };

    messages['change-gizmo-tool'] = async (name: string) => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Gizmo', 'setTransformToolName', [name]);
    };

    messages['change-gizmo-pivot'] = async (name: string) => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Gizmo', 'setPivot', [name]);
    };

    messages['change-gizmo-coordinate'] = async (type: string) => {
        if (!$scene || (type !== 'local' && type !== 'global')) {
            return null;
        }
        await $scene.forwarding('Gizmo', 'setCoordinate', [type]);
    };

    messages['focus-camera'] = async (uuids: string[] | null) => {
        if (!$scene) {
            return null;
        }
        if (uuids) {
            await $scene.forwarding('Camera', 'focus', [uuids]);
        }
    };
}
