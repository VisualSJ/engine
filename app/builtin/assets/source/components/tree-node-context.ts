'use strict';
import { join } from 'path';
const { shell } = require('electron');
const utils = require('./tree-utils');
const {createMenu} = require('./panel-context');

exports.menu = (vm: any, asset: ItreeAsset) => {
    Editor.Menu.popup({
        menu: [
            {
                label: Editor.I18n.t('assets.menu.new'),
                enabled: !utils.canNotCreateAsset(asset),
                submenu: createMenu((addAsset: IaddAsset) => {
                    addAsset.uuid = asset.uuid;
                    vm.$emit('addTo', addAsset);
                }),
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.copy'),
                enabled: !utils.canNotCopyAsset(asset),
                click() {
                    vm.$emit('copy', asset.uuid);
                },
            },
            {
                label: Editor.I18n.t('assets.menu.paste'),
                enabled: !utils.canNotPasteAsset(asset),
                click() {
                    vm.$emit('paste', asset.uuid);
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.rename'),
                enabled: !utils.canNotRenameAsset(asset),
                click(event: Event) {
                    vm.rename(asset);
                },
            },
            {
                label: Editor.I18n.t('assets.menu.delete'),
                enabled: !utils.canNotDeleteAsset(asset),
                click() {
                    vm.$emit('ipcDelete', asset.uuid);
                },
            },
            { type: 'separator' },
            {
                label: Editor.I18n.t('assets.menu.revealInExplorer'),
                enabled: !utils.canNotShowInExplorer(asset),
                click() {
                    shell.showItemInFolder(asset.file);
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.reimport'),
                enabled: !utils.canNotRevealInLibrary(asset),
                click() {
                    vm.$emit('reimport', asset.uuid);
                },
            },
            {
                label: Editor.I18n.t('assets.menu.revealInlibrary'),
                enabled: !utils.canNotRevealInLibrary(asset),
                click() {
                    const exts = Object.keys(asset.library);
                    if (exts.length === 0) {
                        return;
                    }

                    const path = asset.library[exts[0]];
                    if (path) {
                        shell.showItemInFolder(path);
                    }
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.showUuid'),
                click() {
                    console.info(`UUID: ${asset.uuid}, PATH: ${asset.source}`);
                },
            },
        ],
    });
};
