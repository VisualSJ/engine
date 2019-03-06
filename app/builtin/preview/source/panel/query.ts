'use strict';

import { ipcRenderer } from 'electron';

let callback: any = null;
let currentID: any = null;
let contentID: any = null;

ipcRenderer.on('query-preview-data', (event: any, buffer: Buffer) => {
    callback(buffer);
});

export async function init(id: number) {
    contentID = id;
    currentID = await new Promise((resolve) => {
        ipcRenderer.once('query-current-content-id:reply', (event: any, id: number) => {
            resolve(id);
        });
        ipcRenderer.send('query-current-content-id');
    });

    callback && ipcRenderer.sendTo(contentID, 'query-preview-data', currentID);
}

export function queryPreviewData(id: number, width: number, height: number) {
    return new Promise((resolve) => {
        callback = resolve;
        ipcRenderer.sendTo(contentID, 'query-preview-data', currentID, id, width, height);
    });
}
