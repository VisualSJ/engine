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
                    db.vm.$refs.tree.addTo({ type: 'folder' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newJavaScript'),
                click() {
                    db.vm.$refs.tree.addTo({ type: 'js' });
                },
            },
            {
                label: Editor.I18n.t('assets.menu.newTypeScript'),
                click() {
                    db.vm.$refs.tree.addTo({ type: 'ts' });
                },
            },
            {
                label: Editor.I18n.t('assets.menu.newCoffeeScript'),
                click() {
                    db.vm.$refs.tree.addTo({ type: 'coffee' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newScene'),
                click() {
                    db.vm.$refs.tree.addTo({ type: 'scene' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newMaterials'),
                click() {
                    db.vm.$refs.tree.addTo({ type: 'mtl' });
                },
            },
            {
                label: Editor.I18n.t('assets.menu.newEffect'),
                click() {
                    db.vm.$refs.tree.addTo({ type: 'effect' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newAnimationClip'),
                click() {
                    db.vm.$refs.tree.addTo({ type: 'anim' });
                },
            },
            {
                type: 'separator',
            },
            {
                label: Editor.I18n.t('assets.menu.newAutoAtlas'),
                click() {
                    db.vm.$refs.tree.addTo({ type: 'pac' });
                },
            },
            {
                label: Editor.I18n.t('assets.menu.newLabelAtlas'),
                click() {
                    db.vm.$refs.tree.addTo({ type: 'labelatlas' });
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
                            db.vm.$refs.tree.addTo({ type: 'folder' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newJavaScript'),
                        click() {
                            db.vm.$refs.tree.addTo({ type: 'js' });
                        },
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newTypeScript'),
                        click() {
                            db.vm.$refs.tree.addTo({ type: 'ts' });
                        },
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newCoffeeScript'),
                        click() {
                            db.vm.$refs.tree.addTo({ type: 'coffee' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newScene'),
                        click() {
                            db.vm.$refs.tree.addTo({ type: 'scene' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newMaterials'),
                        click() {
                            db.vm.$refs.tree.addTo({ type: 'mtl' });
                        },
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newEffect'),
                        click() {
                            db.vm.$refs.tree.addTo({ type: 'effect' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newAnimationClip'),
                        click() {
                            db.vm.$refs.tree.addTo({ type: 'anim' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newAutoAtlas'),
                        click() {
                            db.vm.$refs.tree.addTo({ type: 'pac' });
                        },
                    },
                    {
                        type: 'separator',
                    },
                    {
                        label: Editor.I18n.t('assets.menu.newLabelAtlas'),
                        click() {
                            db.vm.$refs.tree.addTo({ type: 'labelatlas' });
                        },
                    },
                ],
            },
        ],
    });
};

exports.popupSortType = (event: Event) => {
    const m = Editor.Menu.popup({
        // @ts-ignore
        x: event.pageX,
        // @ts-ignore
        y: event.pageY,
        menu: [
            {
                label: Editor.I18n.t('assets.menu.sortName'),
                type: 'radio',
                checked: db.vm.sortType === 'name',
                click() {
                    db.vm.sortType = 'name';
                },
            },
            {
                label: Editor.I18n.t('assets.menu.sortExtension'),
                type: 'radio',
                checked: db.vm.sortType === 'ext',
                click() {
                    db.vm.sortType = 'ext';
                },
            },
        ],
    });
};
