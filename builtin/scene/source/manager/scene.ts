'use strict';

////////////
// 场景管理器

import { readFileSync } from 'fs';
import { join } from 'path';

import { query, walk } from './node';

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
export function queryNodeTree(uuid?: string): NodeTreeItem[] {
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
            return [];
        }

        return [step(node)];
    }

    const nodes = [];

    for (let i = 0; i < scene._entities._count; i++) {
        const child = scene._entities._data[i];
        if (child._parent && child._parent.constructor.name === 'Level') {
            nodes.push(step(child));
        }
    }

    return nodes;
}
