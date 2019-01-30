'use strict';
import { join } from 'path';
const db = require('./panel-db');
const utils = require('./tree-utils');

exports.createMenu = (callback: any): any[] => {
    return [
        {
            label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
            click() {
                callback('');
            },
        },
        {
            label: Editor.I18n.t('hierarchy.menu.new3dObject'),
            submenu: [
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dCube'),
                    click() {
                        callback('30da77a1-f02d-4ede-aa56-403452ee7fde');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dCylinder'),
                    click() {
                        callback('ab3e16f9-671e-48a7-90b7-d0884d9cbb85');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dSphere'),
                    click() {
                        callback('655c9519-1a37-472b-bae6-29fefac0b550');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dCapsule'),
                    click() {
                        callback('73ce1f7f-d1f4-4942-ad93-66ca3b3041ab');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dCone'),
                    click() {
                        callback('6350d660-e888-4acf-a552-f3b719ae9110');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dTorus'),
                    click() {
                        callback('d47f5d5e-c931-4ff4-987b-cc818a728b82');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dPlane'),
                    click() {
                        callback('40563723-f8fc-4216-99ea-a81636435c10');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.new3dQuad'),
                    click() {
                        callback('34a07346-9f62-4a84-90ae-cb83f7a426c1');
                    },
                },
            ],
        },
        {
            label: Editor.I18n.t('hierarchy.menu.newEffects'),
            submenu: [
                {
                    label: Editor.I18n.t('hierarchy.menu.newEffectsParticle'),
                    click() {
                        callback('f09a0597-10e6-49e5-8759-a148b5e85395');
                    },
                },
            ],
        },
        {
            label: Editor.I18n.t('hierarchy.menu.newUI'),
            submenu: [
                {
                    label: Editor.I18n.t('hierarchy.menu.newUICanvas'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUISprite'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUILabel'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIButton'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUICanvas'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIToggle'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIToggleGroup'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUISlider'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIProgressBar'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIWidget'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIEditBox'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUILayout'),
                    enabled: false,
                    click() {
                        callback('');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIScrollView'),
                    enabled: false,
                    click() {
                        callback('');
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
                        callback('a0e9756d-9128-4f49-8097-e041c8b733b8');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newLightPoint'),
                    click() {
                        callback('4182ee46-ffa0-4de2-b66b-c93cc6c7e9b8');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newLightSpot'),
                    click() {
                        callback('7a49aa24-bd7a-40a8-b31a-b2a9da85abcd');
                    },
                },
            ],
        },
        {
            label: Editor.I18n.t('hierarchy.menu.newCameraObject'),
            click() {
                callback('bb0a6472-cd67-4afb-a031-94fca8f4cc92');
            },
        },
    ];
};

function panelMenu() {
    return [
        {
            label: Editor.I18n.t('hierarchy.menu.newNode'),
            submenu: exports.createMenu((assetUuid: string) => {
                db.vm.$refs.tree.ipcAdd({assetUuid});
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
        menu: exports.createMenu((assetUuid: string) => {
            db.vm.$refs.tree.ipcAdd({assetUuid});
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
