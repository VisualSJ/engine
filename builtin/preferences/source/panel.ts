'use strict';

import { readFileSync , writeFileSync } from 'fs';
import { join } from 'path';
const profile = Editor.Profile.load('profile://global/packages/preferences.json');
let panel: any = null;
let vm: any = null;
const Vue = require('vue/dist/vue.js');
const LANGUAGE = ['en', 'zh'];
export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const $ = {
    loading: '.loading',
    language: '.language',
    preferences: '.preferences'
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
    vm = new Vue({
        el: panel.$.preferences,
        data: {
            activeNav: 'gneneral',
            preferences: { },
            interface: {
                gneneral: {
                    language: 'enums',
                    theme: 'enums',
                    treeState: 'enums',
                    ipAdress: 'enums',
                    showBuildLog: 'boolean',
                    step: 'int',
                    showDialog: 'boolean',
                    autoTrim: 'boolean',
                },
                dataEditor: {
                    autoCompilerScript: 'boolean',
                }
            }
        },
        created() {
            this.init();
            Editor.I18n.on('switch', () => {
                this.init();
            });
        },
        methods: <any>{
            t(parent: string, text: string, type: string) {
                let name = `preferences.${parent}.${text}`;
                if (type) {
                    name += `.${type}`;
                }
                return Editor.I18n.t(name);
            },
            init() {
                this.preferences = JSON.parse(JSON.stringify(profile._type2data.global));
                const index = LANGUAGE.indexOf(this.preferences.gneneral.language);
                if (index !== -1) {
                    this.preferences.gneneral.language = index;
                }
            },
            change(event: Event) {
                const $target = event.target;
                // @ts-ignore
                let $parent = $target.parentNode;
                while ($parent.tagName !== 'UI-PROP') {
                    $parent = $parent.parentNode;
                }
                // @ts-ignore
                if (!($target && $parent.path && event.target.value)) {
                    return;
                }
                // @ts-ignore
                this.preferences[this.activeNav][$parent.path] = $target.value;
                // @ts-ignore
                switch ($parent.path) {
                    case 'language':
                        // @ts-ignore
                        this.preferences.language = event.target.value;
                        Editor.I18n.switch(LANGUAGE[this.preferences.language]);
                        profile.set('gneneral.language', LANGUAGE[this.preferences.language]);
                        profile.save();
                        break;
                    case 'theme':
                        break;
                    case 'step':
                        // @ts-ignore
                        Editor.UI.NumInput.updateStep(event.target.value);
                        break;
                }
            },
        }
    });
}

export async function beforeClose() {}

export async function close() {}
