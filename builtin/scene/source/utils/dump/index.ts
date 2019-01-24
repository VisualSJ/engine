'use strict';

import {
    INode, IProperty,
} from './interface';

import {
    encodeNode,
} from './encode';

import {
    decodeNode,
    decodePatch,
} from './decode';

export function get(node: any) {
    return encodeNode(node);
}

export async function set(dump: INode, node?: any) {
    return await decodeNode(dump, node);
}

export function patch(path: string, dump: IProperty, node: any) {
    return decodePatch(path, dump, node);
}
