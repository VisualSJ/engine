'use strict';

import { readTemplate } from '../../utils';

export const template = readTemplate('./public/prop.html');

export const props = [
    'width',
    'height',

    'auto', // 是否自动渲染
    'value',
];

export const components = {
    'ui-array': require('./ui-array'),
    'ui-null': require('./ui-null'),
    'ui-number': require('./ui-number'),
    'ui-bool': require('./ui-bool'),
    'ui-size': require('./ui-size'),
    'ui-vec2': require('./ui-vec2'),
    'ui-vec3': require('./ui-vec3'),
    'ui-enum': require('./ui-enum'),
    'ui-color': require('./ui-color'),
    'ui-rect': require('./ui-rect'),
    'ui-node': require('./ui-node'),
    'ui-asset': require('./ui-asset'),
    'ui-component': require('./ui-component'),
    'ui-object': require('./ui-object'),
    'ui-depend': require('./ui-depend'),
    'ui-curve': require('./ui-curve'),
    'ui-gradient': require('./ui-gradient'),
};

export const methods = {
    /**
     * 绑定数据有提交
     * @param event
     */
    _onConfirm(event: CustomEvent) {
        const vm: any = this;
        const dump = vm.value;

        if (!dump.path) {
            return;
        }
        event.stopPropagation();

        // @ts-ignore
        const childPath = event.target.path;
        if (childPath) {
            // @ts-ignore
            const childValue = event.target.value;
            vm.$root.$emit('set-property', {
                path: dump.path + '.' + childPath,
                type: 'Array',
                value: childValue,
            });
            return;
        }

        vm.$root.$emit('set-property', {
            path: dump.path,
            type: dump.type,
            value: dump.value,
        });
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
