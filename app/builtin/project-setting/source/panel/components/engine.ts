'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../../static/template/components/engine.html'), 'utf8');

export const props = [
    'position',
];

export function data() {
    return {
        settings: {
            use_global: true,
            physics: 'cannon',
            javascript: {
                builtin: true,
                custom: '',
            },
        },
    };
};

export const watch = {
    position() {
        // @ts-ignore
        this.refresh();
    }
};

export const computed = {};

export const components = {};

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string) {
        const name = `project-setting.engine.${key}`;
        return Editor.I18n.t(name);
    },
    /**
     * 刷新组件
     */
    async refresh() {
        // @ts-ignore
        const vm: any = this;
        vm.settings.use_global = await Editor.Ipc.requestToPackage('engine', 'get-config', 'local', `${Editor.Project.type}.use_global`);
        vm.settings.javascript.builtin = await Editor.Ipc.requestToPackage('engine', 'get-config', vm.position, `${Editor.Project.type}.javascript.builtin`);
        vm.settings.javascript.custom = await Editor.Ipc.requestToPackage('engine', 'get-config', vm.position, `${Editor.Project.type}.javascript.custom`);

        vm.settings.physics = await Editor.Ipc.requestToPackage('engine', 'get-config', 'local', `${Editor.Project.type}.physics`);
    },

    /**
     * 将数据重新设置到 profile，并保存
     * @param event 
     * @param key 
     */
    _onSettingsChanged(event: any, key: string) {
        // @ts-ignore
        Editor.Ipc.sendToPackage('engine', 'set-config', this.position, `${Editor.Project.type}.${key}`, event.target.value);

        const array = key.split('.');
        // @ts-ignore
        let data = this.settings;
        for (let i = 0; i < array.length - 1; i++) {
            data = data[array[i]];
        }

        data[array[array.length - 1]] = event.target.value;
    },

    _onSelectChanged(event: any, key: string) {
        Editor.Ipc.sendToPackage('engine', 'set-config', 'local', `${Editor.Project.type}.${key}`, event.target.value);
    },
};

export function mounted() {
    // @ts-ignore
    this.refresh();
};
