'use strict';

export const template = `
<div class="ui-string">
    <ui-input
        :value="value"
        @change="$emit('input', $event.target.value)"
    ></ui-input>
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
