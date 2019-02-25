'use strict';
import { join } from 'path';
const { shell } = require('electron');
const utils = require('./tree-utils');

exports.menu = (self: any, asset: ItreeAsset) => {
    Editor.Menu.popup({
        menu: [
            {
                label: Editor.I18n.t('assets.menu.new'),
                enabled: !utils.canNotCreateAsset(asset),
                submenu: [
                    {
                        label: Editor.I18n.t('assets.menu.newFolder'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'folder' }, asset.uuid);
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newJavaScript'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'js' }, asset.uuid);
                        },
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newTypeScript'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'ts' }, asset.uuid);
                        },
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newCoffeeScript'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'coffee' }, asset.uuid);
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newScene'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'scene' }, asset.uuid);
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newMaterials'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'mtl' }, asset.uuid);
                        },
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newEffect'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'effect' }, asset.uuid);
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newAnimationClip'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'anim' }, asset.uuid);
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newAutoAtlas'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'pac' }, asset.uuid);
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newLabelAtlas'),
                        click() {
                            self.$emit('ipcAdd', { ext: 'labelatlas' }, asset.uuid);
                        },
                    },
                ],
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.copy'),
                enabled: !utils.canNotCopyAsset(asset),
                click() {
                    self.$emit('copy', asset.uuid);
                },
            },
            {
                label: Editor.I18n.t('assets.menu.paste'),
                enabled: !utils.canNotPasteAsset(asset),
                click() {
                    self.$emit('paste', asset.uuid);
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.rename'),
                enabled: !utils.canNotRenameAsset(asset),
                click(event: Event) {
                    self.rename(asset);
                },
            },
            {
                label: Editor.I18n.t('assets.menu.delete'),
                enabled: !utils.canNotDeleteAsset(asset),
                click() {
                    self.$emit('ipcDelete', asset.uuid);
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
