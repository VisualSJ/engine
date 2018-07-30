'use strict';

import { readFileSync } from 'fs';
import { join, extname } from 'path';

export const template = readFileSync(join(__dirname, '../../static/template/tree.html'), 'utf8');

export const props: string[] = [
    'list',
    'select',
];

export function data () {
    return {};
};

export const methods = {
    /**
     * 选中某个节点
     * @param event 
     * @param uuid 
     */
    selectNode (event: Event, uuid: string) {
        Editor.Ipc.sendToPackage('selection', 'clear', 'node');
        Editor.Ipc.sendToPackage('selection', 'select', 'node', uuid);
    },
};