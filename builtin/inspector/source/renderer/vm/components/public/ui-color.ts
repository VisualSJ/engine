'use strict';

export const template = `
<div class="ui-color"
    @change.stop="$emit('input', translate($event.target.value))"
>
    <ui-color
        :disabled="readonly"
        :value="color"
        @change="_onChange($event)"
    ></ui-color>
</div>
`;

export const props = [
    'readonly',

    'value',
];

export const components = {};

export const methods = {
    /**
     * 刷新 color 组件显示的数据颜色
     */
    refresh() {
        // @ts-ignore
        const vm: any = this;

        if (vm.value) {
            vm.color = JSON.stringify([vm.value.r, vm.value.g, vm.value.b, vm.value.a]);
        } else {
            vm.color = '[255, 255, 255, 255]';
        }
    },

    /**
     * 将 ui-color 返回的 value 翻译成 dump 数据
     * @param color
     */
    translate(color: number[]) {
        return {
            r: color[0],
            g: color[1],
            b: color[2],
            a: color[3],
        };
    },

    /**
     * 数据更改的时候，需要间隔发送上传数据
     * @param event
     */
    _onChange(event: CustomEvent) {
        // @ts-ignore
        const vm: any = this;

        if (vm.lock) {
            return;
        }
        vm.lock = true;
        setTimeout(() => {
            const event = document.createEvent('HTMLEvents');
            event.initEvent('confirm', true, true);
            vm.$el.dispatchEvent(event);
            vm.lock = false;
        }, 200);
    },
};

export const watch = {
    value() {
        // @ts-ignore
        this.refresh();
    },
};

export function data() {
    return {
        color: '[255, 255, 255, 255]',
    };
}

export function mounted() {
    // @ts-ignore
    this.refresh();
}
