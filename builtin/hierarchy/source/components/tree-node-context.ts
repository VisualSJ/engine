'use strict';
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
                enabled: !utils.canNotPasteNode(node),
                submenu: [
                    {
                        label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
                        click() {
                            // @ts-ignore
                            self.$emit('ipcAdd', { type: 'node' }, node.uuid);
                        },
                    },
                ],
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('hierarchy.menu.copy'),
                enabled: !utils.canNotCopyNode(node),
                click() {
                    // @ts-ignore
                    self.$emit('copy', node.uuid);
                },
            },
            {
                label: Editor.I18n.t('hierarchy.menu.paste'),
                enabled: !utils.canNotPasteNode(node),
                click() {
                    // @ts-ignore
                    self.$emit('paste', node.uuid);
                },
            },
            { type: 'separator' },
            {
                label: Editor.I18n.t('hierarchy.menu.rename'),
                enabled: !utils.canNotRenameNode(node),
                click(event: Event) {
                    // @ts-ignore
                    self.rename(node);
                },
            },
            {
                label: Editor.I18n.t('hierarchy.menu.delete'),
                enabled: !utils.canNotDeleteNode(node),
                click() {
                    // @ts-ignore
                    self.$emit('ipcDelete', node.uuid);
                },
            },
            { type: 'separator' },
            {
                label: Editor.I18n.t('hierarchy.menu.showUuid'),
                click() {
                    console.info(`UUID: ${node.uuid}`);
                },
            },
        ],
    });
};
