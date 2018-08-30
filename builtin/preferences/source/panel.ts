'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const profile = Editor.Profile.load('profile://global/packages/preferences.json');
let panel: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    language: '.language',
};

export const methods = {};

export const messages = {
    'asset-db:ready'() {
        panel.$.loading.hidden = true;
    },
    'asset-db:close'() {
        panel.$.loading.hidden = false;
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    const isReady = await Editor.Ipc.requestToPackage('asset-db', 'query-is-ready');
    panel.$.loading.hidden = isReady;

    const language = profile.get('language') || 'en';

    panel.$.language.value = language;
    panel.$.language.addEventListener('confirm', () => {
        Editor.I18n.switch(panel.$.language.value);
        profile.set('language', panel.$.language.value);
        profile.save();
    });
}

export async function beforeClose() {}

export async function close() {}
