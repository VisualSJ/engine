'use strict';

import { join } from 'path';
import { readFileSync } from 'fs';

let panel: any = null;

export const style = readFileSync(join(__dirname, '../static', '/style/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
};

export const methods = {};

export const messages = {
    'asset-db:ready' () {
        panel.$.loading.hidden = true;
    },
    'asset-db:close' () {
        panel.$.loading.hidden = false;
    },
};

export async function ready () {
    // @ts-ignore
    panel = this;

    let isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
    panel.$.loading.hidden = isReady;
};

export async function beforeClose () {};

export async function close () {};
