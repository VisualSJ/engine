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

export function set(dump: INode, node?: any) {
    return decodeNode(dump, node);
}

export function patch(path: string, dump: IProperty, node: any) {
    return decodePatch(path, dump, node);
}
