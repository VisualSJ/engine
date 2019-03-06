'use strict';

import {
    INode, IProperty,
} from './interface';

import {
    encodeComponent, encodeNode,
} from './encode';

import {
    decodeNode,
    decodePatch,
} from './decode';

export function get(node: any) {
    return encodeNode(node);
}

export function getComponent(comp: any) {
    return encodeComponent(comp);
}

export async function set(dump: INode, node?: any) {
    return await decodeNode(dump, node);
}

export function patch(path: string, dump: IProperty, node: any) {
    return decodePatch(path, dump, node);
}
