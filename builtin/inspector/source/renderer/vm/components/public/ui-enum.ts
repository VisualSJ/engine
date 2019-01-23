'use strict';

export const template = `
<div class="ui-enum"
    @change.stop="$emit('input', $event.target.value)"
>
    <ui-select
        :disabled="readonly"
        :value="value"
    >
        <option
            v-for="item in list"
            :value="item.value"
        >{{item.name}}</option>
    </ui-select>
</div>
`;

export const props = [
    'readonly',
    'list',
    'value',
];

export const components = {};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
