'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const { getType, T } = require('../utils');

const defaultOmitKey = ['uuid', 'name', 'active', 'children', 'parent', '__comps__'];

const compOmitKey = ['enabled', 'enabledInHierarchy', 'node'];

export const template = readFileSync(join(__dirname, '../../static/2d/node.html'), 'utf8');

export const props: string[] = ['node', 'onNodePropertyChange'];

export function data() {
    return {};
}

export const components = {
    'comp-section': require('./common/comp-section')
};

export const methods = {
    getType,
    T,

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
     * 弹出添加组件菜单
     * @param {*} event
     */
    addCompPopup(this: any, event: any) {
        const { left, bottom } = event.target.getBoundingClientRect();
        const {
            uuid: { value: uuid }
        } = this.node;
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        Editor.Menu.popup({
            x,
            y,
            menu: [
                {
                    label: 'Button',
                    click() {
                        Editor.Ipc.sendToPanel('inspector', 'create-component', this.params);
                    },
                    params: { uuid, component: 'cc.Button' }
                },
                {
                    label: 'Sprite',
                    click() {
                        Editor.Ipc.sendToPanel('inspector', 'create-component', this.params);
                    },
                    params: { uuid, component: 'cc.Sprite' }
                }
            ]
        });
    },

    /**
     * 返回 node | component 的右键菜单
     * @param {*} event
     * @param {(number | undefined)} index
     * @returns
     */
    getContextMenu(this: any, event: any, index: number | undefined) {
        const { left, bottom } = event.target.getBoundingClientRect();
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        // 返回 node 右键菜单
        return Editor.Menu.popup({
            x,
            y,
            menu: [
                {
                    label: this.T('reset_node'),
                    enabled: false,
                    click() {
                        // todo
                    }
                },
                {
                    label: this.T('reset_all'),
                    enabled: false,
                    click() {
                        // todo
                    }
                }
            ]
        });
    }
};
