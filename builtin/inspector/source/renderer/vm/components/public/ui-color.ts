'use strict';

export const template = `
<div class="ui-color"
    @change="$emit('input', translate($event.target.value))"
>
    <ui-color
        :value="color"
    ></ui-color>
</div>
`;

export const props = [
    'value',
];

export const components = {};

export const methods = {
    refresh() {
        // @ts-ignore
        const vm: any = this;

        if (vm.value) {
            vm.color = JSON.stringify([vm.value.r, vm.value.g, vm.value.b, vm.value.a]);
        } else {
            vm.color = '[255, 255, 255, 255]';
        }
    },

    translate(color: number[]) {
        return {
            r: color[0],
            g: color[1],
            b: color[2],
            a: color[3],
        };
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
