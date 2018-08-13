'use strict';

////////////
// 场景管理器

import { join } from 'path';
import { readFileSync } from 'fs';

import {
    walk,
    query,
} from './node';

declare const cc: any;

let element: any = null;
let scene: any = null;

/**
 * 初始化场景管理器
 * @param panel 
 */
export function initEngineManager (panel: any) {
    element = panel;

    let script = document.createElement('script');
    script.src = join(__dirname, '../../engine/engine.dev.js');
    document.body.appendChild(script);
};

/**
 * 打开指定的场景
 * 不传入的打开新场景
 * @param uuid 
 */
export async function open (uuid: string) {
    let asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
    let sceneFile = asset.files[0];

    let $canvas = document.createElement('canvas');
    element.appendChild($canvas);

    // 启动引擎
    scene = new cc.App($canvas);
    scene.resize();
    scene.debugger.start();

    // @ts-ignore 暴露当前场景
    window.app = scene;

    // 加载指定的场景
    let result = readFileSync(sceneFile, 'utf8');
    eval(`${result}\n//# sourceURL=${sceneFile}`);

    // 爬取所有的节点数据
    walk(scene);

    // 启动场景
    scene.run();
};

/**
 * 关闭当前场景
 */
export function close () {
    if (scene) {
        scene.destroy();
    }
    let $canvas = element.querySelector('canvas');
    $canvas && $canvas.remove();

    scene = null;
    // @ts-ignore
    window.app = null;

    // 清空有关场景的动作
    Editor.History.clear({
        panel: 'scene',
    });
};

/**
 * 查询当前运行的场景内的节点树
 * @param uuid 传入的时候生成当前节点的节点树，不传入的话生成场景的节点树
 */
export function queryNodeTree (uuid?: string) : NodeTreeItem[] {

    let step = function (node: any) : NodeTreeItem {
        return {
            name: node.name,
            uuid: node._id,
            children: node._children.map(step),
        };
    };

    if (uuid) {
        let node = query(uuid);

        if (!node) {
            return [];
        }

        return [step(node)];
    }

    let nodes = [];

    for (let i=0; i<scene._entities._count; i++) {
        let node = scene._entities._data[i];
        nodes.push(step(node));
    }

    return nodes;
};