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
                label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
                click() {
                    db.vm.$refs.tree.ipcAdd({ type: 'node' });
                }
            },
        ]
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
                label: Editor.I18n.t('hierarchy.menu.newNode'),
                submenu: [
                    {
                        label: Editor.I18n.t('hierarchy.menu.newNodeEmpty'),
                        click() {
                            // @ts-ignore
                            db.vm.$refs.tree.ipcAdd({ type: 'node' });
                        }
                    },
                ]
            },
        ]
    });
};
