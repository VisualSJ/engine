'use strict';
import { join } from 'path';
const { shell } = require('electron');
const db = require('./panel-db');

exports.popupNew = (event: Event) => {
    Editor.Menu.popup({
        // @ts-ignore
        x: event.pageX,
        // @ts-ignore
        y: event.pageY,
        menu: [
            {
                label: Editor.I18n.t('assets.menu.newFolder'),
                click() {
                    db.vm.$refs.tree.ipcAdd({ ext: 'folder' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newJavaScript'),
                click() {
                    db.vm.$refs.tree.ipcAdd({ ext: 'js' });
                },
            },
            {
                label: Editor.I18n.t('assets.menu.newTypeScript'),
                click() {
                    db.vm.$refs.tree.ipcAdd({ ext: 'ts' });
                },
            },
            {
                label: Editor.I18n.t('assets.menu.newCoffeeScript'),
                click() {
                    db.vm.$refs.tree.ipcAdd({ ext: 'coffee' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newScene'),
                click() {
                    db.vm.$refs.tree.ipcAdd({ ext: 'fire' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newAnimationClip'),
                click() {
                    db.vm.$refs.tree.ipcAdd({ ext: 'anim' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newAutoAtlas'),
                click() {
                    db.vm.$refs.tree.ipcAdd({ ext: 'pac' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newLabelAtlas'),
                click() {
                    db.vm.$refs.tree.ipcAdd({ ext: 'labelatlas' });
                },
            },
        ],
    });
};

exports.popupSearchType = (event: Event) => {
    const m = Editor.Menu.popup({
        // @ts-ignore
        x: event.pageX,
        // @ts-ignore
        y: event.pageY,
        menu: [
            {
                label: Editor.I18n.t('assets.menu.searchName'),
                type: 'radio',
                checked: db.vm.searchType === 'name',
                click() {
                    db.vm.searchType = 'name';
                },
            },
            {
                label: Editor.I18n.t('assets.menu.searchUuid'),
                type: 'radio',
                checked: db.vm.searchType === 'uuid',
                click() {
                    db.vm.searchType = 'uuid';
                },
            },
            {
                label: Editor.I18n.t('assets.menu.searchType'),
                type: 'radio',
                checked: db.vm.searchType === 'type',
                click() {
                    db.vm.searchType = 'type';
                },
            },
        ],
    });
};

exports.popupContext = (event: Event) => {
    Editor.Menu.popup({
        // @ts-ignore
        x: event.pageX,
        // @ts-ignore
        y: event.pageY,
        menu: [
            {
                label: Editor.I18n.t('assets.menu.new'),
                submenu: [
                    {
                        label: Editor.I18n.t('assets.menu.newFolder'),
                        click() {
                            db.vm.$refs.tree.ipcAdd({ ext: 'folder' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newJavaScript'),
                        click() {
                            db.vm.$refs.tree.ipcAdd({ ext: 'js' });
                        },
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newTypeScript'),
                        click() {
                            db.vm.$refs.tree.ipcAdd({ ext: 'ts' });
                        },
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newCoffeeScript'),
                        click() {
                            db.vm.$refs.tree.ipcAdd({ ext: 'coffee' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newScene'),
                        click() {
                            db.vm.$refs.tree.ipcAdd({ ext: 'fire' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newAnimationClip'),
                        click() {
                            db.vm.$refs.tree.ipcAdd({ ext: 'anim' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newAutoAtlas'),
                        click() {
                            db.vm.$refs.tree.ipcAdd({ ext: 'pac' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newLabelAtlas'),
                        click() {
                            db.vm.$refs.tree.ipcAdd({ ext: 'labelatlas' });
                        },
                    },
                ],
            },
        ],
    });
};
