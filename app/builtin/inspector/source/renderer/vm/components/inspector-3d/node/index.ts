'use strict';

import { off, on } from '../../../event';
import { mergeDumps, readTemplate, translationDump, transSceneDump } from '../../../utils';

export const template = readTemplate('inspector-3d/node/index.html');

export const props = [
    'width',
    'height',

    'uuids',
    'language',
];

export const components = {
    'ui-prop': require('../../public/ui-prop'),
    comp: require('./comp'),
    'scene-node': require('./scene'),
    'prefab-node': require('./prefab'),
};

export const methods = {
    /**
     * 中断正在执行的操作
     * 一般是选中器其他物体
     */
    break() {},

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
        debugger
        // @ts-ignore
        const vm: any = this;

        const id = ++vm.num;

        if (!vm.uuids || !vm.uuids.length) {
            vm.dump = null;
            return;
        }

        const dumps = [];
        for (const uuid of vm.uuids) {
            const dump = await Editor.Ipc.requestToPanel('scene', 'query-node', uuid);
            dumps.push(dump);

            // 如果请求数据中途，又有数据更新（num 变化），则忽略这个数据
            if (id !== vm.num) {
                return;
            }
        }

        const result = mergeDumps(dumps);

        if (result.isScene) {
            vm.dump = transSceneDump(result);
        } else {
            vm.dump = translationDump(result);
        }
    },

    /**
     * 添加组件
     */
    async _onAddComponentMenu(event: any) {
        // @ts-ignore
        const vm: any = this;

        if (vm.uuids.length !== 1) {
            return;
        }

        const uuid = vm.uuids[0];

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
                if (!(path in data)) {
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
                        Editor.Ipc.sendToPanel('scene', 'snapshot');
                        Editor.Ipc.sendToPanel('scene', 'create-component', {
                            uuid,
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
    uuids() {
        // @ts-ignore
        this.refresh();
    },
};

export function data() {
    return {
        num: 0,
        dump: null,
    };
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;

    vm.refresh();

    // 记录 commit 是因为需要过滤掉当前不需要的请求数据
    // 如果正在请求数据，但这时候又 commit 了，则可以忽略到正在请求的数据
    // 重新发起新的数据请求
    on('commit', () => {
        vm.num++;
    });
}

export function destroyed() {
    off();
}
