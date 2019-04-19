'use strict';

import { readFileSync, readJSONSync } from 'fs-extra';
import { join } from 'path';

const profile = {
    global: Editor.Profile.load('profile://global/packages/project-setting.json'),
    local: Editor.Profile.load('profile://local/packages/project-setting.json'),
};

export const template = readFileSync(join(__dirname, '../../../static/template/components/modules.html'), 'utf8');

export const props = [
    'position',
];

export function data() {
    return {
        all: true,
        modules: {},
        settings: {
            use_global: true,
            excluded: [],
        },
    };
};

export const watch = {
    'settings.excluded'() {
        // @ts-ignore
        profile[this.position].set('modules', this.settings);
        // @ts-ignore
        profile[this.position].save();
    },

    position() {
        // @ts-ignore
        this.refresh();
    },
};

export const computed = {};

export const components = {};

export const methods = {
    /**
     * 翻译
     * @param key
     */
    t(key: string) {
        const name = `project-setting.modules.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 更新全选状态
     */
    updateAll() {
        // @ts-ignore
        const vm: any = this;
        vm.all = Object.keys(vm.modules).every(key => vm.modules[key].checked);
    },

    /**
     * 切换全选状态
     * @param bool 
     */
    changeAll(bool: boolean) {
        // @ts-ignore
        const vm: any = this;
        Object.keys(vm.modules).forEach((key) => {
            const item = vm.modules[key];
            if (item.locked) {
                return;
            }
            item.checked = bool;

            const index = vm.settings.excluded.indexOf(key);
            if (!item.checked) {
                index === -1 && vm.settings.excluded.push(key);
            } else {
                index !== -1 && vm.settings.excluded.splice(index, 1);
            }
        });

        vm.all = bool;
    },

    /**
     * 切换单个元素的选中状态
     * @param bool 
     */
    changeItem(key: string, bool: boolean) {
        // @ts-ignore
        const vm: any = this;
        const item = vm.modules[key];
        if (!item) {
            return;
        }

        item.checked = bool;
        vm.updateAll();

        const index = vm.settings.excluded.indexOf(key);
        if (!item.checked) {
            index === -1 && vm.settings.excluded.push(key);
        } else {
            index !== -1 && vm.settings.excluded.splice(index, 1);
        }
    },
    
    /**
    * 刷新组件
    */
   async refresh() {
        // @ts-ignore
        const vm: any = this;

        if (Object.keys(vm.modules).length === 0) {
            const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
            const modulesInfo = readJSONSync(join(info.path, 'modules.json'));
    
            let modules = Object.create(null);
            modulesInfo.forEach((item: any) => {
                item.checked = vm.settings.excluded.indexOf(item.id) === -1;
                modules[item.id] = item;
            });
    
            vm.modules = modules;
        }

        // @ts-ignore
        Object.keys(this.settings).forEach((key) => {
            // @ts-ignore
            this.settings[key] = profile[this.position].get(`modules.${key}`);
        });

        Object.keys(vm.modules).forEach((key: string) => {
            const item = vm.modules[key];
            item.checked = vm.settings.excluded.indexOf(item.id) === -1;
        });

        vm.updateAll();

   },

    /**
     * 将数据重新设置到 profile，并保存
     * @param event 
     * @param key 
     */
    _onSettingsChanged(event: any, key: string) {
        // @ts-ignore
        const data = profile[this.position];
        // @ts-ignore
        this.settings[key] = event.target.value;

        // 全部重新设置一遍是为了第一次生成整份的数据
        // @ts-ignore
        profile[this.position].set(`modules`, this.settings);
        data.save();
    },
};

export async function mounted() {
    // @ts-ignore
    this.refresh();
};