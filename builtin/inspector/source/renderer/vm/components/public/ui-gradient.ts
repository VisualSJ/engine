'use strict';

export const template = `
<div class="ui-gradient"
    @change.stop="$emit('input', $event.target.value)"
>
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
    },
};

export const watch = {};

export function data() {
    return {
        style: {
            background: 'linear-gradient(to right, #fff 0%,#777 100%)',
        },
    };
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;
    vm.refresh();
}
