'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

const { getType, T } = require('../../utils');

const customDrawItems = ['cc.Sprite'];

const defaultOmitKey = ['uuid', 'name', 'active', 'children', 'parent', '__comps__'];

const compOmitKey = ['enabled', 'enabledInHierarchy', 'node'];

export const template = readFileSync(join(__dirname, '../../../static/2d/common/comp-section.html'), 'utf8');

export const props: string[] = ['target', 'type', 'total', 'index', 'onNodePropertyChange'];

export function data() {
    return {
        atlasUuid: '',
        atlasUuids: '',
        atlasMulti: false,

        spriteUuid: '',
        spriteUuids: '',
        spriteMulti: false
    };
}

export const methods = {
    getType,
    T,

    /**
     * 打开帮助文档
     * @param {*} event
     */
    openHelpClick(event: any) {
        // todo
    },

    /**
     * 返回 component 的右键菜单
     * @param {*} event
     * @param {(number | undefined)} index
     * @returns
     */
    getContextMenu(this: any, event: any) {
        const { left, bottom } = event.target.getBoundingClientRect();
        const {
            target: {
                value: {
                    node: { value: uuid }
                }
            },
            total,
            index
        } = this;
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        return Editor.Menu.popup({
            x,
            y,
            menu: [
                {
                    label: this.T('remove'),
                    click() {
                        Editor.Ipc.sendToPanel('inspector', 'remove-array-element', this.params);
                    },
                    params: { uuid, path: '__comps__', index }
                },
                {
                    type: 'separator'
                },
                {
                    label: this.T('move_up'),
                    enabled: index !== 0,
                    click() {
                        Editor.Ipc.sendToPanel('inspector', 'move-array-element', this.params);
                    },
                    params: { uuid, path: '__comps__', target: index, offset: -1 }
                },
                {
                    label: this.T('move_down'),
                    enabled: index !== total - 1,
                    click() {
                        Editor.Ipc.sendToPanel('inspector', 'move-array-element', this.params);
                    },
                    params: { uuid, path: '__comps__', target: index, offset: 1 }
                }
            ]
        });
    },

    /**
     * 是否使用自定义组件渲染数据
     * @param {*} this
     * @returns {boolean}
     */
    customDraw(this: any): boolean {
        return customDrawItems.includes(this.type);
    },

    /**
     * 获取 component 需要渲染的 keys
     * @param {number} index
     * @returns {string[]}
     */ getCompKeys(this: any): string[] {
        const omitKeys: string[] = [...new Set([...defaultOmitKey, ...compOmitKey])];

        return Object.keys(this.target.value).filter((key: string) => !omitKeys.includes(key) && !key.startsWith('_'));
    }
};

export function mounted(this: any) {
    if (this.customDraw()) {
        const div = document.createElement('div');
        const path = join(__dirname, '../comps/sprite.js');
        const ComponentClass: any = Vue.extend(require(path));
        const instance = new ComponentClass({ propsData: { target: this.target }, parent: this });
        instance.$mount();
        this.$el.appendChild(instance.$el);
    }
}
