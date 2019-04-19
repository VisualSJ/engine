'use strict';
const { shell } = require('electron');
const utils = require('./tree-utils');
const {createMenu} = require('./panel-context');

const sceneMenu = (vm: any, node: ItreeNode) => [
    {
        label: Editor.I18n.t('hierarchy.menu.newNode'),
        enabled: !utils.canNotCreateNode(node) && utils.enableContextMenu(),
        submenu: createMenu((addNode: IaddNode) => {
            addNode.parent = node.uuid;
            vm.$emit('addTo', addNode);
        }),
    },
    {
        label: Editor.I18n.t('hierarchy.menu.paste'),
        enabled: !utils.canNotPasteNode(node) && utils.enableContextMenu(),
        click() {
            vm.$emit('paste', node.uuid);
        },
    },
    { type: 'separator' },
    {
        label: Editor.I18n.t('hierarchy.menu.showUuid'),
        click() {
            console.info(`UUID: ${node.uuid}`);
        },
    },
];

const nodeMenu = (vm: any, node: ItreeNode) => [
    {
        label: Editor.I18n.t('hierarchy.menu.newNode'),
        enabled: !utils.canNotCreateNode(node) && utils.enableContextMenu(),
        submenu: createMenu((addNode: IaddNode) => {
            addNode.parent = node.uuid;
            vm.$emit('addTo', addNode);
        }),
    },
    {
        type: 'separator',
    },
    {
        label: Editor.I18n.t('hierarchy.menu.copy'),
        enabled: !utils.canNotCopyNode(node) && utils.enableContextMenu(),
        click() {
            if (!vm.selects.includes(node.uuid)) {
                vm.$emit('copy', [node.uuid]);
            } else {
                vm.$emit('copy', vm.selects);
            }
        },
    },
    {
        label: Editor.I18n.t('hierarchy.menu.paste'),
        enabled: !utils.canNotPasteNode(node) && utils.enableContextMenu(),
        click() {
            vm.$emit('paste', node.uuid);
        },
    },
    {
        label: Editor.I18n.t('hierarchy.menu.duplicate'),
        enabled: !utils.canNotCopyNode(node) && utils.enableContextMenu(),
        click(event: Event) {
            if (!vm.selects.includes(node.uuid)) {
                vm.$emit('duplicate', [node.uuid]);
            } else {
                vm.$emit('duplicate', vm.selects);
            }
        },
    },
    { type: 'separator' },
    {
        label: Editor.I18n.t('hierarchy.menu.rename'),
        enabled: !utils.canNotRenameNode(node) && utils.enableContextMenu(),
        click(event: Event) {
            vm.rename(node);
        },
    },
    {
        label: Editor.I18n.t('hierarchy.menu.delete'),
        enabled: !utils.canNotDeleteNode(node) && utils.enableContextMenu(),
        click() {
            vm.$emit('ipcDelete', node.uuid);
        },
    },
    { type: 'separator' },
    {
        label: Editor.I18n.t('hierarchy.menu.showUuid'),
        click() {
            console.info(`UUID: ${node.uuid}`);
        },
    },
];

exports.menu = (event: Event, vm: any, node: ItreeNode) => {
    Editor.Menu.popup({
        // @ts-ignore
        x: event.pageX,
        // @ts-ignore
        y: event.pageY,
        menu: node.isScene ? sceneMenu(vm, node) : nodeMenu(vm, node),
    });
};
