'use strict';

////////////
// 场景管理器

import { readFileSync } from 'fs';
import { join } from 'path';

import {
    query,
    walk,
} from './node';

import {
    restoreNode,
} from '../utils/dump';

declare const cc: any;

let element: any = null;
let scene: any = null;

/**
 * 初始化场景管理器
 * @param panel
 */
export function initEngineManager(panel: any) {
    element = panel;

    const script = document.createElement('script');
    script.src = join(__dirname, '../../engine/engine.dev.js');
    document.body.appendChild(script);
}

/**
 * 打开指定的场景
 * 不传入的打开新场景
 * @param uuid
 */
export async function open(uuid: string) {
    const asset = await Editor.Ipc.requestToPackage(
        'asset-db',
        'query-asset-info',
        uuid
    );
    const sceneFile = asset.files[0];

    const $canvas = document.createElement('canvas');
    element.appendChild($canvas);

    // 启动引擎
    scene = new cc.App($canvas);
    scene.resize();
    scene.debugger.start();

    // @ts-ignore 暴露当前场景
    window.app = scene;

    // 加载指定的场景
    const result = readFileSync(sceneFile, 'utf8');
    eval(`${result}\n//# sourceURL=${sceneFile}`);

    // 爬取所有的节点数据
    walk(scene);

    // 启动场景
    scene.run();
}

/**
 * 关闭当前场景
 */
export function close() {
    if (scene) {
        scene.destroy();
    }
    const $canvas = element.querySelector('canvas');
    $canvas && $canvas.remove();

    scene = null;
    // @ts-ignore
    window.app = null;

    // 清空有关场景的动作
    Editor.History.clear({
        panel: 'scene',
    });
}

/**
 * 查询当前运行的场景内的节点树
 * @param uuid 传入的时候生成当前节点的节点树，不传入的话生成场景的节点树
 */
export function queryNodeTree(uuid?: string): NodeTreeItem | null {
    /**
     * 逐步打包数据
     * @param node
     */
    const step = (node: any): NodeTreeItem => {
        return {
            name: node.name,
            uuid: node._id,
            children: node._children.map(step)
        };
    };

    if (uuid) {
        const node = query(uuid);
        if (!node) {
            return null;
        }
        return step(node);
    }

    return step(scene.activeLevel);
}

/**
 * 在场景内创建一个新的节点，并挂载到指定的父节点下
 * @param uuid 父节点的 uuid
 */
export function createNode(uuid: string, name: string = '', components: string[] = [], dump?: NodeDump) {
    if (!scene) {
        return;
    }

    const parent = query(uuid);
    const entity = scene.createEntity(name);

    components.forEach((name) => {
        entity.addComp(name);
    });

    if (dump) {
        restoreNode(dump, entity);
    }

    parent.append(entity);
    walk(scene);

    // 广播更改消息
    Editor.Ipc.sendToAll('scene:node-created', entity._id);
    return entity._id;
}

/**
 * 移除某个节点
 * @param uuid 移除节点的 uuid
 */
export function removeNode(uuid: string) {
    const node = query(uuid);
    node.remove();

    // 广播更改消息
    Editor.Ipc.sendToAll('scene:node-removed', uuid);
}
