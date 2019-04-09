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
     *   记录当前打开的场景 uuid
     */
    messages['open-scene'] = async (uuid: string) => {
        if (!$scene) {
            return '';
        }
        await $scene.forwarding('Scene', 'open', [uuid]);
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

        const savePath = await Editor.Dialog.saveFile({
            title: Editor.I18n.t('scene.save_as'),
            filters: [
                { name: 'Scene File', extensions: ['scene'] },
            ],
        });

        if (!savePath) {
            return;
        }

        const assetsPath = join(Editor.Project.path, 'assets');
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

        return await $scene.forwarding('Scene', 'save', url);
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
    messages['change-clip-sample'] = (clip: string, sample: number) => {
        return $scene.forwatding('Animation', 'operation', 'changeSample', clip, sample);
    }

    /**
     * 更改当前正在编辑的动画的 wrapMode
     */
    messages['change-clip-wrap-mode'] = (clip: string, wrapMode: number) => {
        return $scene.forwatding('Animation', 'operation', 'changeWrapMode', clip, wrapMode);
    }

    /**
     * 更改当前正在编辑的动画的 speed
     */
    messages['change-clip-speed'] = (clip: string, speed: number) => {
        return $scene.forwatding('Animation', 'operation', 'changeSpeed', clip, speed);
    }

    // TODO 暴露各种操作消息
}
