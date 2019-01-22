'use strict';

import { close, open } from '../../../../gradient-editor/manager';

export const template = `
<div class="ui-gradient">
    <div class="graphics"
        :style="style"
        @click="_onClick"
    ></div>
</div>
`;

export const props = [
    'value',
];

export const components = {};

export const methods = {

    /**
     * 应用数据
     * @param dump
     */
    apply(dump: any) {
        // @ts-ignore
        const vm: any = this;

        vm.value.colorKeys = dump.colorKeys;
        vm.value.alphaKeys = dump.alphaKeys;
        vm.value.mode = dump.mode;

        const event = document.createEvent('HTMLEvents');
        event.initEvent('confirm', true, true);
        vm.$el.dispatchEvent(event);

        vm.refresh();
    },

    /**
     * 刷新预览
     */
    refresh() {
        // @ts-ignore
        const vm: any = this;

        const array = vm.value.colorKeys.map((key: any) => {
            return `rgba(${key.color[0]},${key.color[1]},${key.color[2]},${key.color[3] || 1}) ${key.time * 100}%`;
        });

        if (array.length === 0) {
            array.push(`rgba(255,255,255,1) 100%`);
        }

        if (array.length === 1) {
            array[1] = array[0];
        }

        vm.style.background = `linear-gradient(to right, ${array.join(',')})`;
    },

    _onClick() {
        // @ts-ignore
        open(this.value, this);
    },
};

export const watch = {};

export function data() {
    return {
        style: {
            background: 'linear-gradient(to right, #fff 0%,#fff 100%)',
        },
    };
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;
    vm.refresh();
}

export function destroyed() {
    // @ts-ignore
    const vm: any = this;
    close(vm);
}
