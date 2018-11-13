'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const profile = {
    global: Editor.Profile.load('profile://global/packages/engine.json'),
    local: Editor.Profile.load('profile://local/packages/engine.json'),
};
let panel: any = null;

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

    const current = profile.local.get('current') || { '2d': '', '3d': '', };
    let custom = profile.local.get('custom') || { '2d': '', '3d': '', };
    if (typeof custom !== 'object') {
        custom = { '2d': '', '3d': '', };
    }

    const vm = new Vue({
        el: panel.$.section,
        data: {
            pt: Editor.Project.type,
            custom,
            current: {
                '2d': current['2d'] || 'builtin',
                '3d': current['3d'] || 'builtin',
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
            custom: {
                deep: true,
                handler() {
                    if (vm.current[vm.type] === 'custom') {
                        alert(Editor.I18n.t('engine.change'));
                    }
                    profile.local.set('custom', vm.custom);
                    profile.local.save();
                },
            }
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

    vm.$on('change-custom', (path: string) => {
        vm.custom[vm.type] = path;
    });
}

export async function beforeClose() {}

export async function close() {}
