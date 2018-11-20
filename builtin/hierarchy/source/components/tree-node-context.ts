'use strict';
import { join } from 'path';
const { shell } = require('electron');
const utils = require('./tree-utils');

exports.menu = (self: any, node: ItreeNode) => {
    Editor.Menu.popup({
        // @ts-ignore
        x: event.pageX,
        // @ts-ignore
        y: event.pageY,
        menu: [
            {
                label: Editor.I18n.t('hierarchy.menu.newNode'),
                submenu: [
                    {
                        label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
                        click() {
                            // @ts-ignore
                            self.$emit('ipcAdd', { type: 'emptyNode' }, node.uuid);
                        }
                    }
                ]
            },
            {
                type: 'separator'
            },
            {
                label: Editor.I18n.t('hierarchy.menu.copy'),
                click() {
                    // @ts-ignore
                    self.$emit('copy', node.uuid);
                }
            },
            {
                label: Editor.I18n.t('hierarchy.menu.paste'),
                click() {
                    // @ts-ignore
                    self.$emit('paste', node.uuid);
                }
            },
            { type: 'separator' },
            {
                label: Editor.I18n.t('hierarchy.menu.rename'),
                click(event: Event) {
                    // @ts-ignore
                    self.rename(node);
                }
            },
            {
                label: Editor.I18n.t('hierarchy.menu.delete'),
                click() {
                    // @ts-ignore
                    self.$emit('ipcDelete', node.uuid);
                }
            },
            { type: 'separator' },
            {
                label: Editor.I18n.t('hierarchy.menu.showUuid'),
                click() {
                    console.info(`UUID: ${node.uuid}`);
                },
            },
        ]
    });
};
