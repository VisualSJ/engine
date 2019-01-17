'use strict';

export const template = `
<div class="ui-component">
    <ui-drag-object
        :dropable="type"
        :value="value ? value.uuid : null"
        @change.stop="_onChange"
    ></ui-drag-object>
</div>
`;

export const props = [
    'type',
    'value',
];

export const components = {};

export const methods = {
    _onChange(event: any) {
        const vm: any = this;
        vm.value.uuid = event.target.value;
        vm.$emit('input', vm.value);
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
