'use strict';

export const template = `
<div class="ui-bool"
    @change.stop="$emit('input', $event.target.value)"
>
    <ui-checkbox
        :disabled="readonly"
        :invalid="value === undefined"
        :value="value"
        :default="dataDefault"
    ></ui-checkbox>
</div>
`;

export const props = [
    'readonly',
    'dataDefault',
    'value',
];

export const components = {};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
