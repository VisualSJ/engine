'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

export const template = readFileSync(join(__dirname, '../../../static/template/extension.html'), 'utf8');

export const props = ['language'];

export function data() {
    return {
        list: [],
        active: '',
        file: '',
    };
};

export const watch = {
    file() {

        // @ts-ignore
        const vm : any= this;

        try {
            const mod = require(vm.file);
            vm.$refs.settings.innerHTML = mod.template;
            const obj: any = { $: {} };

            // 初始化 ¥
            Object.keys(mod.$ || {}).forEach((key) => {
                const name = mod.$[key];
                if (name[0] === '.') {
                    obj.$[key] = vm.$refs.settings.getElementsByClassName(name.substr(1))[0];
                } else if (key[0] === '#') {
                    obj.$[key] = document.getElementById(name.substr(1));
                } else {
                    obj.$[key] = vm.$refs.settings.getElementsByTagName(name)[0];
                }
            });

            // 初始化 methods
            Object.keys(mod.methods || {}).forEach((name) => {
                obj[name] = mod.methods[name];
            });

            mod.ready && mod.ready.call(obj);
        } catch (error) {
            console.error(error);
        }
    }
};

export const computed = {};

export const components = {};

export const methods = {
    
};

export function mounted() {
    // @ts-ignore
    const vm = this;

    const list = Editor.Package.getPackages();
    vm.list = list.filter((item: any) => {
        if (!item.enable || !item.info.preferences) {
            return false;
        }
        return true;
    });

    if (!vm.active) {
        const item = vm.list[0];
        vm.active = item.name;
        vm.file = join(item.path, item.info.preferences);
    }
};