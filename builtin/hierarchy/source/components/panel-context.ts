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
                    label: Editor.I18n.t('hierarchy.menu.newUILayout'),
                    click() {
                        callback('a9ef7dfc-ea8b-4cf8-918e-36da948c4de0');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUICanvas'),
                    click() {
                        callback('f773db21-62b8-4540-956a-29bacf5ddbf5');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUISprite'),
                    click() {
                        callback('9db8cd0b-cbe4-42e7-96a9-a239620c0a9d');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUILabel'),
                    click() {
                        callback('36008810-7ad3-47c0-8112-e30aee089e45');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIButton'),
                    click() {
                        callback('90bdd2a9-2838-4888-b66c-e94c8b7a5169');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIToggle'),
                    click() {
                        callback('0e89afe7-56de-4f99-96a1-cba8a75bedd2');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIToggleGroup'),
                    click() {
                        callback('1d86d123-9a96-4be1-9455-ecb1ae4cf8ab');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUISlider'),
                    click() {
                        callback('2bd7e5b6-cd8c-41a1-8136-ddb8efbf6326');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIProgressBar'),
                    click() {
                        callback('0d9353c4-6fb9-49bb-bc62-77f1750078c2');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIWidget'),
                    click() {
                        callback('36ed4422-3542-4cc4-bf02-dc4bfc590836');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIEditBox'),
                    click() {
                        callback('05e79121-8675-4551-9ad7-1b901a4025db');
                    },
                },
                {
                    label: Editor.I18n.t('hierarchy.menu.newUIScrollView'),
                    click() {
                        callback('c1baa707-78d6-4b89-8d5d-0b7fdf0c39bc');
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
