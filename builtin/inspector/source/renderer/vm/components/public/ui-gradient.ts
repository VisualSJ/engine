'use strict';

export const template = `
<div class="ui-gradient">
    <div class="graphics"
        :style="style"
    ></div>
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

        const array = vm.value.gradient.value.colorKeys.value.map((key: any) => {
            return `rgba(${key.color.r},${key.color.g},${key.color.b},${key.color.a}) ${key.time * 100}%`;
        });

        if (array.length === 0) {
            array.push(`rgba(255,255,255,1) 100%`);
        }

        if (array.length === 1) {
            array[1] = array[0];
        }

        vm.style.background = `linear-gradient(to right, ${array.join(',')})`;
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
