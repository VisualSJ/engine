'use strict';

const ipc = require('@base/electron-base-ipc');

import { outputFile } from 'fs-extra';
import { join, relative } from 'path';

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
    messages['open-devtools'] = () => {
        if (!$scene) {
            return null;
        }
        $scene.$scene.openDevTools();
    };

    /**
     * 打开某个场景
     *   通知 webview 打开场景
     */
    messages['open-scene'] = async (uuid: string) => {
        if (!$scene) {
            return '';
        }
        await $scene.forwarding('Scene', 'open', [uuid || false]); // false 表示强制新建一个空场景
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

        return await $scene.forwarding('Scene', 'save');
    };

    /**
     * 另存场景
     */
    messages['save-as-scene'] = async () => {
        if (!$scene) {
            return '';
        }

        const assetsPath = join(Editor.Project.path, 'assets');

        const savePath = await Editor.Dialog.saveFile({
            title: Editor.I18n.t('scene.save_as'),
            root: assetsPath,
            filters: [
                { name: 'Scene File', extensions: ['scene'] },
            ],
        });

        if (!savePath) {
            return;
        }

        if (!savePath.startsWith(assetsPath) || !savePath.endsWith('.scene')) {
            await Editor.Dialog.show({
                type: 'warning',
                title: Editor.I18n.t('scene.messages.warning'),
                message: Editor.I18n.t('scene.messages.save_as_fail'),
            });
            return;
        }
        const relatiePath = relative(assetsPath, savePath);
        const url = `db://assets/${relatiePath.replace(/\\/g, '/')}`;

        return await $scene.forwarding('Scene', 'save', [url]);
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
            return await $scene.forwarding('Node', 'createNodeFromAsset', [options.parent, options.assetUuid, {
                name: options.name,
                type: 'cc.Prefab',
            }]);
        }

        // 返回 uuid
        return await $scene.forwarding('Node', 'createNode', [options.parent, options.name, options.dump]);
    };

    /**
     * 从资源数据还原一个 prefab 节点
     */
    messages['restore-prefab'] = async (uuid: string, assetUuid: string) => {
        if (!$scene) {
            return null;
        }

        // 返回 uuid
        return await $scene.forwarding('Node', 'restorePrefab', [uuid, assetUuid]);
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
        await $scene.forwarding('Node', 'removeComponent', [options.uuid]);
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

    /**
     * 软刷新场景
     */
    messages['soft-reload'] = async () => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Scene', 'softReload');
    };

    /**
     * 实时预览 material 数据
     */
    messages['preview-material'] = async (uuid: string, material: any) => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Asset', 'previewMaterial', [uuid, material]);
    };

    ///////////
    // gizmo //
    ///////////

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

    messages['change-is2D'] = async (value: boolean) => {
        if (!$scene) {
            return null;
        }
        await $scene.forwarding('Gizmo', 'setIs2D', [value]);
    };

    messages['focus-camera'] = async (uuids: string[] | null) => {
        if (!$scene) {
            return null;
        }
        if (uuids) {
            await $scene.forwarding('Camera', 'focus', [uuids]);
        }
    };

    messages['apply-material'] = async (uuid: string, materialDump: any) => {
        await $scene.forwarding('Asset', 'applyMaterial', [uuid, materialDump]);
    };

    messages['copy-camera-data-to-nodes'] = async (uuids: string[] | null) => {
        if (!$scene) {
            return null;
        }
        if (uuids) {
            await $scene.forwarding('Camera', 'copyCameraDataToNodes', [uuids]);
        }
    };

    ///////////////
    // aniamtion //
    ///////////////

    /**
     * 更改当前正在编辑的动画的 sample
     */
    messages['change-clip-sample'] = (uuid: string, clipUuid: string, sample: number) => {
        return $scene.forwarding('Animation', 'operation', ['changeSample', uuid, clipUuid, sample]);
    };

    /**
     * 更改当前正在编辑的动画的 wrapMode
     */
    messages['change-clip-wrap-mode'] = (uuid: string, clipUuid: string, wrapMode: number) => {
        return $scene.forwarding('Animation', 'operation', ['changeWrapMode', uuid, clipUuid, wrapMode]);
    };

    /**
     * 更改当前动画编辑模式
     */
    messages.record = async (uuid: string, active: boolean) => {
        await $scene.forwarding('Animation', 'record', [uuid, active]);
    };

    /**
     * 更改当前当前关键帧
     */
    messages['set-edit-time'] = (time: number) => {
        return $scene.forwarding('Animation', 'setCurEditTime', [time]);
    };

    /**
     * 更改当前正在编辑的动画的 speed
     */
    messages['change-clip-speed'] = (clipUuid: string, speed: number) => {
        return $scene.forwarding('Animation', 'operation', ['changeSpeed', clipUuid, speed]);
    };

    /**
     * 更改当前正在编辑的动画的播放状态
     */
    messages['change-clip-state'] = (oprate: string, clipUuid: string) => {
        return $scene.forwarding('Animation', oprate, [clipUuid]);
    };

    /**
     * 更改当前正在编辑的动画 uuid
     */
    messages['change-edit-clip'] = (nodeUuid: string, clipUuid: string) => {
        return $scene.forwarding('Animation', 'setEditClip', [nodeUuid, clipUuid]);
    };

    /**
     * 操作动画的属性轨道
     */
    messages['change-clip-prop'] = (oprate: string, clipUuid: string, path: string, comp: any, prop: string) => {
        return $scene.forwarding('Animation', 'operation', [oprate, clipUuid, path, comp, prop]);
    };

    /**
     * 新增关键帧
     */
    messages['create-clip-key'] = (clipUuid: string, path: string, comp: any, prop: string, frame: number) => {
        return $scene.forwarding('Animation', 'operation', ['createKey', clipUuid, path, comp, prop, frame]);
    };

    /**
     * 移除关键帧
     */
    messages['remove-clip-key'] = (clipUuid: string, path: string, comp: any, prop: string, frame: number) => {
        return $scene.forwarding('Animation', 'operation', ['removeKey', clipUuid, path, comp, prop, frame]);
    };

    /**
     * 移动关键帧
     */
    messages['move-clip-keys'] = (clipUuid: string, path: string, comp: any, prop: string, frames: number[], offset: number) => {
        return $scene.forwarding('Animation', 'operation', ['moveKeys', clipUuid, path, comp, prop, frames, offset]);
    };

    /**
     * 清除轨道上的关键帧
     */
    messages['clear-prop-keys'] = (clipUuid: string, path: string, comp: any, prop: string) => {
        return $scene.forwarding('Animation', 'operation', ['clearKeys', clipUuid, path, comp, prop]);
    };

    /**
     * 清除节点动画数据
     */
    messages['clear-node-clip'] = (clipUuid: string, path: string) => {
        return $scene.forwarding('Animation', 'operation', ['clearNode', clipUuid, path]);
    };

    /**
     * 添加帧事件
     */
    messages['add-clip-event'] = (clipUuid: string, frame: number, funcName: string , params: any[]) => {
        return $scene.forwarding('Animation', 'operation', ['addEvent', clipUuid, frame, funcName, params]);
    };

    /**
     * 移动帧事件
     */
    messages['move-clip-events'] = (clipUuid: string, frames: number[], offset: number) => {
        return $scene.forwarding('Animation', 'operation', ['moveEvents', clipUuid, frames, offset]);
    };

    /**
     * 删除帧事件
     */
    messages['delete-clip-event'] = (clipUuid: string, frame: number) => {
        return $scene.forwarding('Animation', 'operation', ['deleteEvent', clipUuid, frame]);
    };

    /**
     * 更新帧事件
     */
    messages['update-clip-event'] = (clipUuid: string, frame: number, events: any[]) => {
        return $scene.forwarding('Animation', 'operation', ['updateEvent', clipUuid, frame, events]);
    };

    /**
     * 保存动画数据
     */
    messages['save-clip'] = () => {
        return $scene.forwarding('Animation', 'save');
    };

    /**
     * 保存动画曲线数据
     */
    messages['save-curve-data'] = (clipUuid: string, path: string, comp: any, prop: string, frame: number, data: number[]) => {
        return $scene.forwarding('Animation', 'operation', ['updateCurveOfKey', clipUuid, path, comp, prop, frame, data]);
    };

    // TODO 暴露各种操作消息
}
