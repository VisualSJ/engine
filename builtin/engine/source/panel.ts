'use strict';

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const profile = {
    global: Editor.Profile.load('profile://global/packages/engine.json'),
    local: Editor.Profile.load('profile://local/packages/engine.json'),
};
let panel: any = null;

const Vue = require('vue/dist/vue.js');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

export const fonts = [
    {
        name: 'engine',
        file: 'packages://engine/static/engine.woff',
    }
];

export const $ = {
    section: '.section',
};

export const methods = {};

export const messages = {};

export async function ready() {
    // @ts-ignore
    panel = this;

    const current = profile.local.get('current') || {};

    const vm = new Vue({
        el: panel.$.section,
        data: {
            pt: Editor.Project.type,
            current: {
                '2d': current['2d'] || '2.0.0-alpha',
                '3d': current['3d'] || '0.15.0',
            },

            setting: 'local',
            type: Editor.Project.type,
        },
        watch: {
            current: {
                deep: true,
                handler() {
                    alert(Editor.I18n.t('engine.change'));
                    profile.local.set('current', vm.current);
                    profile.local.save();
                },
            },
        },
        components: {
            engine: require('../static/components/engine'),
        },
        methods: {
            /**
             * 切换设置位置选项卡
             */
            _onChangeSettingType(event: Event, type: string) {
                vm.setting = type;
            },

            /**
             * 切换引擎的类型选项卡
             */
            _onChangeEngineType(event: Event, type: string) {
                vm.type = type;
            },
        }
    });
}

export async function beforeClose() {}

export async function close() {}
