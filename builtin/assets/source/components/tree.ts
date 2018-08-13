'use strict';

import { readFileSync } from 'fs';
import { extname, join } from 'path';

export const template = readFileSync(
    join(__dirname, '../../static/template/tree.html'),
    'utf8'
);

export const props: string[] = ['list', 'select'];

export function data() {
    return {};
}

export const methods = {
    /**
     * 打开一个 asset
     * @param event
     * @param uuid
     */
    async openAsset(event: Event, uuid: string) {
        const asset = await Editor.Ipc.requestToPackage(
            'asset-db',
            'query-asset-info',
            uuid
        );
        const ext = extname(asset.source);
        if (ext === '.scene') {
            Editor.Ipc.sendToPackage('scene', 'open-scene', asset.uuid);
        }
    },

    mouseDownAsset(event: Event, uuid: string) {
        // @ts-ignore
        if (event.button !== 2) {
            return;
        }

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
                            label: 'none',
                            enabled: false,
                            click() {
                                // debugger;
                            }
                        }
                    ]
                },
                {
                    type: 'separator'
                },
                {
                    label: Editor.I18n.t('assets.menu.copy'),
                    click() { }
                },
                {
                    label: Editor.I18n.t('assets.menu.paste'),
                    click() { }
                },
                {
                    type: 'separator'
                },
                {
                    label: Editor.I18n.t('assets.menu.delete'),
                    click() {
                        Editor.Ipc.sendToPackage('asset-db', 'delete-asset', uuid);
                    }
                }
            ]
        });
    },

    /**
     * 选中某个节点
     * @param event
     * @param uuid
     */
    selectAsset(event: Event, uuid: string) {
        Editor.Ipc.sendToPackage('selection', 'clear', 'asset');
        Editor.Ipc.sendToPackage('selection', 'select', 'asset', uuid);
    }
};
