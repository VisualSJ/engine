'use strict';

import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

const profile = {
    default: Editor.Profile.load('profile://default/packages/preferences.json'),
    global: Editor.Profile.load('profile://global/packages/preferences.json'),
};

export const template = readFileSync(join(__dirname, '../../../static/template/edit.html'), 'utf8');

export const props = ['language'];

export function data() {
    return {
        settings: {
            script_editor_list: [],
            script_editor: 'internal',

            picture_editor_list: [],
            picture_editor: 'internal',
        },
    };
};

export const watch = {};

export const computed = {};

export const components = {};

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string, language: string) {
        const name = `preferences.edit.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 更改默认的编辑器
     * @param event 
     * @param type 
     */
    _onEditorChanged(event: any, type: string) {
        // @ts-ignore
        const vm: any = this;
        vm.settings[type] = event.target.value;

        profile.global.set('edit.' + type, vm.settings[type]);
        profile.global.save();
    },

    /**
     * 添加 list
     * @param event 
     * @param type 
     */
    _onBrowserApp(event: any, type: string) {
        // @ts-ignore
        const vm: any = this;

        let path = vm.settings[type];

        if (!path || !existsSync(path)) {
            // 打开默认窗口
            path = Editor.App.path;
        }

        const ext = process.platform === 'win32' ? 'Exe' : 'App';

        // 打开指定路径
        Editor.Dialog.openFile({
            title: '选择编辑器',
            defaultPath: path,
            extensions: {name: ext, extensions: [ext.toLowerCase()]},
        }).then((paths: string[]) => {
            if (!paths[0]) {
                return;
            }

            const item = {
                path: paths[0],
                name: basename(paths[0]),
            };

            vm.settings[type + '_list'].push(item);
            vm.settings[type] = item.path;

            profile.global.set('edit.' + type + '_list', vm.settings[type + '_list']);
            profile.global.set('edit.' + type, vm.settings[type]);
            profile.global.save();
        });
    },

    /**
     * 移除 list
     * @param event 
     * @param type 
     */
    _onEditorRemoved(event: any, type: string) {
        // @ts-ignore
        const vm: any = this;
        const path = vm.settings[type];

        const list = vm.settings[type + '_list'];

        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (item.path === path) {
                list.splice(i, 1);
                vm.settings[type] = '';
                break;
            }
        }

        profile.global.set('edit.' + type + '_list', vm.settings[type + '_list']);
        profile.global.set('edit.' + type, vm.settings[type]);
        profile.global.save();
    },
};

export function mounted() {
    // @ts-ignore
    const vm: any = this;

    vm.settings.script_editor_list = profile.global.get('edit.script_editor_list') || [];
    vm.settings.script_editor = profile.global.get('edit.script_editor') || '';
    vm.settings.picture_editor_list = profile.global.get('edit.picture_editor_list') || [];
    vm.settings.picture_editor = profile.global.get('edit.picture_editor') || '';
};