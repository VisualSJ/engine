'use strict';

export const template = `
<div class="ui-number"
    @change.stop="$emit('input', $event.target.value)"
>
    <span
        v-if="name"
    >{{name}}</span>
    <ui-num-input
        :value="value"
    ></ui-num-input>
</div>
`;

export const props = [
    'name',
    'value',
];

export const components = {};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
