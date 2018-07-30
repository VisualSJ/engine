'use strict';

////////////
// 场景管理器

import { join } from 'path';
import { readFileSync } from 'fs';

import { dumpNode } from '../utils/dump';
import { crawler, query } from './node';

declare const cc: any;

let element: any = null;

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
    let app = new cc.App($canvas);
    // @ts-ignore
    window.app = app;
    app.resize();
    app.debugger.start();

    // 加载指定的场景
    let result = readFileSync(sceneFile, 'utf8');
    eval(`${result}\n//# sourceURL=${sceneFile}`);

    // 爬取所有的节点数据
    crawler(app);

    // 启动场景
    app.run();
};

/**
 * 关闭当前场景
 */
export function close () {
    // @ts-ignore
    if (window.app) {
        // @ts-ignore
        window.app.destroy();
        // @ts-ignore
        window.app = null;
    }
    let $canvas = element.querySelector('canvas');
    $canvas && $canvas.remove();
};

/**
 * 获取一个节点的 dump 数据
 * 如果不传入 uuid 则获取场景的 dump 数据
 * @param uuid 
 */
export function dump (uuid: string | null) {
    if (uuid) {
        let node = query(uuid);
        return dumpNode(node);
    }

    let array = [];
    // @ts-ignore
    for (let i=0; i<app._entities._data.length; i++) {
        // @ts-ignore
        let node = app._entities._data[i];
        if (!node) {
            break;
        }
        array.push(dumpNode(node));
    }
    return array;
};