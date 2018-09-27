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
     * 提供 Editor 的多语言功能
     * @param {...string[]} rest
     * @returns
     */
    t(...rest: string[]) {
        const prefix = 'inspector';
        rest.unshift(prefix);
        return Editor.I18n.t(rest.join('.'));
    },

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
     * @param {number} index
     * @returns {string[]}
     */ getCompKeys(this: any, index: number): string[] {
        const comp = this.node.__comps__.value[index];
        const omitKeys: string[] = [...new Set([...defaultOmitKey, ...compOmitKey])];

        return Object.keys(comp.value).filter((key: string) => !omitKeys.includes(key) && !key.startsWith('_'));
    },

    /**
     * 弹出添加组件菜单
     * @param {*} event
     */
    addCompPopup(this: any, event: any) {
        // const { pageX: x, pageY: y } = event;
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
        const {
            uuid: { value: uuid },
            __comps__: { value: comps }
        } = this.node;
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        if (index !== undefined) {
            // 返回 component 右键菜单
            return Editor.Menu.popup({
                x,
                y,
                menu: [
                    {
                        label: this.t('remove'),
                        click() {
                            Editor.Ipc.sendToPanel('inspector', 'remove-array-element', this.params);
                        },
                        params: { uuid, path: '__comps__', index }
                    },
                    {
                        type: 'separator'
                    },
                    {
                        label: this.t('move_up'),
                        enabled: index !== 0,
                        click() {
                            Editor.Ipc.sendToPanel('inspector', 'move-array-element', this.params);
                        },
                        params: { uuid, path: '__comps__', target: index, offset: -1 }
                    },
                    {
                        label: this.t('move_down'),
                        enabled: index !== comps.length - 1,
                        click() {
                            Editor.Ipc.sendToPanel('inspector', 'move-array-element', this.params);
                        },
                        params: { uuid, path: '__comps__', target: index, offset: 1 }
                    }
                ]
            });
        } else {
            // 返回 node 右键菜单
            return Editor.Menu.popup({
                x,
                y,
                menu: [
                    {
                        label: this.t('reset_node'),
                        enabled: false,
                        click() {
                            // todo
                        }
                    },
                    {
                        label: this.t('reset_all'),
                        enabled: false,
                        click() {
                            // todo
                        }
                    }
                ]
            });
        }
    }
};
