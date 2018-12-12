'use strict';

const ipc = require('@base/electron-base-ipc');
const panelMessage = require('../panel/message').apply();

import { basename } from 'path';

export const messages = {
    /**
     * 打开面板
     */
    open() {
        Editor.Panel.open('scene');
    },

    async 'scene:ready'(uuid: string) {
        let title = `Editor 3D - ${basename(Editor.App.project)} - `;
        if (uuid) {
            const asset = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
            if (asset && asset.source) {
                title += asset.source;
            } else {
                title += 'Untitled';
            }
        } else {
            title += 'Untitled';
        }
        ipc.broadcast('notice:editor-title-change', title);
    },

    'scene:close'() {
        const title = `Editor 3D - ${basename(Editor.App.project)}`;
        ipc.broadcast('notice:editor-title-change', title);
    },
};

// 直接转发所有 panel 上定义的消息
Object.keys(panelMessage).forEach((name) => {
    // @ts-ignore
    messages[name] = async (...args) => {
        return await Editor.Ipc.requestToPanel('scene', name, ...args);
    };
});

export function load() {
    const protocols = {
        import: require('./protocol/import'),
        'project-scripts': require('./protocol/project-scripts'),
    };

    Object.keys(protocols).forEach((name: string) => {
        // @ts-ignore
        const mod = protocols[name];
        require('electron').protocol[mod.type](name, mod.handler, mod.error);
    });
}

export function unload() { }
