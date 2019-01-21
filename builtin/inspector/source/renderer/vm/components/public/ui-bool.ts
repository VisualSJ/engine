'use strict';

export const template = `
<div class="ui-bool"
    @change="$emit('input', $event.target.value)"
>
    <ui-checkbox
        :value="value"
    ></ui-checkbox>
</div>
`;

export const props = [
    'value',
];

export const components = {};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
