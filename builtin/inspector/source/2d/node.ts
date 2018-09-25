'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const defaultOmitKey = ['uuid', 'name', 'active', 'children', 'parent', '__comps__'];

const compOmitKey = ['enabled', 'enabledInHierarchy', 'node'];

export const template = readFileSync(join(__dirname, '../../static/2d/node.html'), 'utf8');

export const props: string[] = ['node', 'onNodePropertyChange'];

export function data() {
    return {};
}

export const methods = {
    /**
     * 获取 node 节点需要渲染的 keys
     * @param {NodeDump} node
     * @returns {string[]}
     */
    getRenderKeys(node: NodeDump): string[] {
        const omitKeys: string[] = [...defaultOmitKey];

        return Object.keys(node).filter((key: string) => !omitKeys.includes(key));
    },
    /**
     * 根据数据返回对应的 type 类型
     * @param {*} target
     * @param {string} key
     * @returns
     */
    handleType(target: any, key: string) {
        const item = target[key];
        if (item && item.type) {
            const prefix = 'cc.';

            return item.type.replace(prefix, '').toLowerCase();
        }
    },
    /**
     * 获取 component 需要渲染的 keys
     * @param {*} this
     * @param {number} index
     * @returns {string[]}
     */
    getCompKeys(this: any, index: number): string[] {
        const comp = this.node.__comps__.value[index];
        const omitKeys: string[] = [...new Set([...defaultOmitKey, ...compOmitKey])];

        return Object.keys(comp.value).filter((key: string) => !omitKeys.includes(key) && !key.startsWith('_'));
    }
};
