'use strict';

import {
    INode, IProperty, IScene,
} from './interface';

import {
    encodeComponent, encodeNode, encodeScene
} from './encode';

import {
    decodeNode,
    decodePatch,
    decodeScene,
} from './decode';

export function get(node: any) {
    if (node.__classname__ === 'cc.Scene') {
        return encodeScene(node);
    }
    return encodeNode(node);
}

export function getComponent(comp: any) {
    return encodeComponent(comp);
}

export async function set(dump: any, node?: any) {
    if (dump.isScene) {
        return await decodeScene(dump, node);
    }
    return await decodeNode(dump, node);
}

export function patch(path: string, dump: IProperty, node: any) {
    return decodePatch(path, dump, node);
}
