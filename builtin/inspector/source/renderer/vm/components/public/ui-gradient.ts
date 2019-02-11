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
    'readyonly',
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

        vm.emitConfirm();
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

    emitConfirm() {
        const vm: any = this;
        const event = document.createEvent('HTMLEvents');
        event.initEvent('confirm', true, true);
        vm.$el.dispatchEvent(event);
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
    if (!vm.value.colorKeys || vm.value.colorKeys.length < 1) {
        vm.value.colorKeys = [{color: [255, 255, 255], time: 0}, {color: [255, 255, 255], time: 1}];
        vm.emitConfirm();
    }
    if (!vm.value.alphaKeys || vm.value.alphaKeys.length < 1) {
        vm.value.alphaKeys = [{alpha: 255, time: 0}, {alpha: 255, time: 1}];
        vm.emitConfirm();
    }
    vm.refresh();
}

export function destroyed() {
    // @ts-ignore
    const vm: any = this;
    close(vm);
}
