'use strict';
import { join } from 'path';
const { shell } = require('electron');
const db = require('./panel-db');

exports.createMenu = (callback: any): any[] => {
    return [
        {
            label: Editor.I18n.t('assets.menu.newFile'),
            click() {
                callback({ type: 'file' });
            },
        },
        {
            label: Editor.I18n.t('assets.menu.newFolder'),
            click() {
                callback({ type: 'folder' });
            },
        },
        {
            type: 'separator',
        },
        {
            label: Editor.I18n.t('assets.menu.newJavaScript'),
            click() {
                callback({ type: 'js' });
            },
        },
        {
            label: Editor.I18n.t('assets.menu.newTypeScript'),
            click() {
                callback({ type: 'ts' });
            },
        },
        {
            type: 'separator',
        },
        {
            label: Editor.I18n.t('assets.menu.newScene'),
            click() {
                callback({ type: 'scene' });
            },
        },
        {
            type: 'separator',
        },
        {
            label: Editor.I18n.t('assets.menu.newMaterial'),
            click() {
                callback({ type: 'mtl' });
            },
        },
        {
            label: Editor.I18n.t('assets.menu.newCubeMap'),
            click() {
                callback({ type: 'cubemap' });
            },
        },
        {
            label: Editor.I18n.t('assets.menu.newPhysicsMaterial'),
            click() {
                callback({ type: 'pmtl' });
            },
        },
        {
            type: 'separator',
        },
        {
            label: Editor.I18n.t('assets.menu.newEffect'),
            click() {
                callback({ type: 'effect' });
            },
        },
    ];
};

function panelMenu() {
    return [
        {
            label: Editor.I18n.t('assets.menu.new'),
            submenu: exports.createMenu((addAsset: IaddAsset) => {
                db.vm.$refs.tree.addTo(addAsset);
            }),
        },
    ];
}
exports.popupNew = (event: Event) => {
    Editor.Menu.popup({
        // @ts-ignore
        x: event.pageX,
        // @ts-ignore
        y: event.pageY,
        menu: exports.createMenu((addAsset: IaddAsset) => {
            db.vm.$refs.tree.addTo(addAsset);
        }),
    });
};

exports.popupContext = (event: Event) => {
    Editor.Menu.popup({
        // @ts-ignore
        x: event.pageX,
        // @ts-ignore
        y: event.pageY,
        menu: panelMenu(),
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
