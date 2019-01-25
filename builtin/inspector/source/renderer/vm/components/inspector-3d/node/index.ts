'use strict';

import { readTemplate, translationDump } from '../../../utils';

export const template = readTemplate('inspector-3d/node/index.html');

export const props = [
    'width',
    'height',

    'uuid',
    'language',
];

export const components = {
    'ui-prop': require('../../public/ui-prop'),
    comp: require('./comp'),
};

export const methods = {
    /**
     * 翻译
     * @param {*} key
     */
    t(key: string): string {
        // @ts-ignore
        return Editor.I18n.t(`inspector.${key}`, this.language);
    },
    /**
     * 刷新当前选中的节点
     */
    async refresh() {
        // @ts-ignore
        const vm: any = this;

        if (!vm.uuid) {
            vm.dump = null;
            return;
        }

        const dump = await Editor.Ipc.requestToPanel('scene', 'query-node', vm.uuid);
        vm.dump = translationDump(dump);
    },

    async _onAddComponentMenu(event: any) {
        // @ts-ignore
        const vm: any = this;

        const { left, bottom } = event.target.getBoundingClientRect();
        const components = await Editor.Ipc.requestToPanel('scene', 'query-components');
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        const menu = {};
        components.forEach((item: any) => {
            let paths = item.path.split('/');

            // 翻译
            paths = paths.map((str: string) => {
                if (!str.startsWith('i18n:')) {
                    return str;
                }
                return Editor.I18n.t('ENGINE.' + str.substr(5)) || str;
            });

            const button = paths.pop();
            let data: any = menu;
            paths.forEach((path: any) => {
                if (!(path in menu)) {
                    data[path] = {};
                }
                data = data[path];
            });
            data[button] = item;
        });

        // @ts-ignore
        function translation(obj: any) {
            const array = Object.keys(obj);
            return array.map((name) => {
                const item = obj[name];
                if (!('name' in item)) {
                    return {
                        label: name.replace(/\./g, '-'),
                        submenu: translation(item),
                    };
                }
                return {
                    label: name.replace(/\./g, '-'),
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'create-component', {
                            uuid: vm.uuid,
                            component: item.priority === -1 ? name : item.name,
                        });
                    },
                };
            });
        }

        Editor.Menu.popup({
            x,
            y,
            menu: translation(menu),
        });
    },
};

export const watch = {
    uuid() {
        // @ts-ignore
        this.refresh();
    },
};

export function data() {
    return {
        dump: null,
    };
}

export function mounted() {
    // @ts-ignore
    this.refresh();
}
