'use strict';

import { readTemplate } from '../../utils';

export const template = readTemplate('./public/prop.html');

export const props = [
    'width',
    'height',

    'auto', // 是否自动渲染
    'empty',
    'value',
];

export const components = {
    'ui-unknown': require('./ui-unknown'),
    'ui-array': require('./ui-array'),
    'ui-null': require('./ui-null'),
    'ui-number': require('./ui-number'),
    'ui-bool': require('./ui-bool'),
    'ui-string': require('./ui-string'),
    'ui-size': require('./ui-size'),
    'ui-vec2': require('./ui-vec2'),
    'ui-vec3': require('./ui-vec3'),
    'ui-vec4': require('./ui-vec4'),
    'ui-mat4': require('./ui-mat4'),
    'ui-enum': require('./ui-enum'),
    'ui-color': require('./ui-color'),
    'ui-rect': require('./ui-rect'),
    'ui-node': require('./ui-node'),
    'ui-asset': require('./ui-asset'),
    'ui-component': require('./ui-component'),
    'ui-object': require('./ui-object'),
    'ui-depend': require('./ui-depend'),
    'ui-curve-range': require('./ui-curve-range'),
    'ui-gradient': require('./ui-gradient'),
    'ui-gradient-range': require('./ui-gradient-range'),
    'ui-click-event': require('./ui-click-event'),
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

        // 保存历史记录
        Editor.Ipc.sendToPanel('scene', 'snapshot');

        // @ts-ignore 数组的 langth
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
    /**
     * 是否是某种类型的数据
     * @param type
     */
    isType(type: string) {
        const vm: any = this;
        if (!vm.value) {
            return false;
        }
        if (vm.value.type === type) {
            return true;
        }
        if (!vm.value.extends || vm.value.extends.length === 0) {
            return false;
        }
        return vm.value.extends.includes(type);
    },

    /**
     * 根据 dump 数据，获取名字
     */
    getName(name: string) {
        if (!name) {
            return '';
        }
        name = name.replace(/^\S/, (str: string) => str.toUpperCase());
        name = name.replace(/_/g, (str: string) => ' ');
        name = name.replace(/ \S/g, (str: string) => ` ${str.toUpperCase()}`);
        return name;
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
