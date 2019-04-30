'use strict';

import { readTemplate } from '../../../utils';

export const template = readTemplate('inspector-3d/node/comp.html');

export const props = [
    'width',
    'height',

    'index',
    'total',
    'uuids',
    'value',
];

const componentMap: any = {
    'cc.ParticleSystemComponent': 'cc-particle-system-component',
    'cc.ButtonComponent': 'cc-button-component',
    'cc.ToggleComponent': 'cc-toggle-component',
    'cc.SliderComponent': 'cc-slider-component',
    'cc.WidgetComponent': 'cc-widget-component',
    'cc.SphereLightComponent': 'cc-sphere-light-component',
    'cc.SpotLightComponent': 'cc-spot-light-component',
    'cc.SpriteComponent': 'cc-sprite-component',
    'cc.AvatarModelComponent': 'cc-avatar-model-component',
};

export const components: any = {
    'ui-prop': require('../../public/ui-prop'),
    'cc-particle-system-component': require('./components/particle-system'),
    'cc-button-component': require('./components/button'),
    'cc-toggle-component': require('./components/toggle'),
    'cc-slider-component': require('./components/slider'),
    'cc-widget-component': require('./components/widget'),
    'cc-sphere-light-component': require('./components/sphere-light'),
    'cc-spot-light-component': require('./components/spot-light'),
    'cc-sprite-component': require('./components/sprite'),
    'cc-avatar-model-component': require('./components/avatar-model'),
};

export const methods = {
    /**
     * 点击右侧设置按钮
     * @param event
     */
    _onClickComponentMenu(event: any) {
        const vm: any = this;

        if (vm.uuids.length !== 1) {
            return;
        }

        const { left, bottom } = event.target.getBoundingClientRect();
        const x = Math.round(left + 5);
        const y = Math.round(bottom + 5);

        const uuid = vm.uuids[0];
        const total = vm.total;
        const index = vm.index;

        Editor.Menu.popup({
            x,
            y,
            menu: [
                {
                    label: Editor.I18n.t('inspector.menu.remove_component'),
                    click() {
                        Editor.Ipc.sendToPanel('scene', 'snapshot');
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
                        Editor.Ipc.sendToPanel('scene', 'snapshot');
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
                        Editor.Ipc.sendToPanel('scene', 'snapshot');
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

    _onDragStart(event: DragEvent) {
        // @ts-ignore
        const data: any = this.value.value;
        event.dataTransfer && event.dataTransfer.setData('value', data.uuid.value);
    },

    /**
     * 获取自定义组件名字
     * @param type
     */
    getCustomComponent(type: string) {
        return componentMap[type];
    },

    /**
     * 将 propMap 进行一次排序
     * @param list
     */
    shortProp(list: any) {
        const orderList: any = [];
        const normalList: any = [];

        Object.keys(list).forEach((key: any) => {
            const item = list[key];
            if ('displayOrder' in item) {
                orderList.push(item);
            } else {
                normalList.push(item);
            }
        });

        orderList.sort((a: any, b: any) => {
            return a.displayOrder - b.displayOrder;
        });

        return orderList.concat(normalList);
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
