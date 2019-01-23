'use strict';

import { readTemplate } from '../../../utils';

export const template = readTemplate('inspector-3d/node/comp.html');

export const props = [
    'width',
    'height',

    'index',
    'total',
    'uuid',
    'value',
];

export const components: any = {
    'ui-prop': require('../../public/ui-prop'),
};

export const methods = {
    /**
     * 点击右侧设置按钮
     * @param event
     */
    _onClickComponentMenu(event: any) {
        const vm: any = this;

        const { left, bottom } = event.target.getBoundingClientRect();
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        const uuid = vm.uuid;
        const total = vm.total;
        const index = vm.index;

        Editor.Menu.popup({
            x,
            y,
            menu: [
                {
                    label: Editor.I18n.t('inspector.menu.remove_component'),
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'remove-array-element', {
                            uuid,
                            path: '__comps__',
                            index,
                        });
                    },
                },
                { type: 'separator' },
                {
                    label: Editor.I18n.t('inspector.menu.move_up_component'),
                    enabled: index !== 0,
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'move-array-element', {
                            uuid,
                            path: '__comps__',
                            target: index,
                            offset: -1,
                        });
                    },
                },
                {
                    label: Editor.I18n.t('inspector.menu.move_down_component'),
                    enabled: index !== total - 1,
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'move-array-element', {
                            uuid,
                            path: '__comps__',
                            target: index,
                            offset: 1,
                        });
                    },
                },
            ],
        });
    },

    /**
     * 是否有自定义页面
     * @param type
     */
    hasCustom(type: string) {
        return !!components[type];
    },
};

export const watch = {
};

export function data() {
    return {

    };
}

export function mounted() {
}
