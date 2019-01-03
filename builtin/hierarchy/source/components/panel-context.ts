'use strict';
import { join } from 'path';
const db = require('./panel-db');
const utils = require('./tree-utils');

exports.createMenu = (callback: any) => {
    return [
        {
            label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
            click() {
                callback('node');
            },
        },
        {
            label: Editor.I18n.t('hierarchy.menu.new3dObject'),
            submenu: [
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dCube'),
                    click() {
                        callback('cube');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dCylinder'),
                    click() {
                        callback('cylinder');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dSphere'),
                    click() {
                        callback('sphere');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dCapsule'),
                    click() {
                        callback('capsule');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dCone'),
                    click() {
                        callback('cone');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dTorus'),
                    click() {
                        callback('torus');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dPlane'),
                    click() {
                        callback('plane');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dQuad'),
                    click() {
                        callback('quad');
                    },
                },
            ],
        },
        {
            label: Editor.I18n.t('hierarchy.menu.new2dObject'),
            submenu: [
                {
                    label: Editor.I18n.t('hierarchy.menu.new2dSprite'),
                    enabled: false,
                    click() {
                        callback('sprite');
                    },
                },
            ],
        },
        {
            label: Editor.I18n.t('hierarchy.menu.newLightObject'),
            submenu: [
                {
                    label: Editor.I18n.t('hierarchy.menu.newLightDirectional'),
                    click() {
                        callback('directional-light');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newLightPoint'),
                    click() {
                        callback('point-light');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newLightSpot'),
                    click() {
                        callback('spot-light');
                    },
                },
            ],
        },
        {
            label: Editor.I18n.t('hierarchy.menu.newCameraObject'),
            click() {
                callback('camera');
            },
        },
    ];
};

function panelMenu() {
    return [
        {
            label: Editor.I18n.t('hierarchy.menu.newNode'),
            submenu: exports.createMenu((type: string) => {
                db.vm.$refs.tree.ipcAdd({type});
            }),
        },
        {
            label: Editor.I18n.t('hierarchy.menu.paste'),
            // @ts-ignore
            enabled: !utils.hasEmptyCopyNodes(),
            click() {
                db.vm.$refs.tree.paste();
            },
        },
    ];
}

exports.popupNew = (event: Event) => {
    Editor.Menu.popup({
        // @ts-ignore
        x: event.pageX,
        // @ts-ignore
        y: event.pageY,
        menu: exports.createMenu((type: string) => {
            db.vm.$refs.tree.ipcAdd({type});
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
