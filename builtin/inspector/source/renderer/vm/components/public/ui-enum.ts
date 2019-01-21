'use strict';

export const template = `
<div class="ui-enum"
    @change="$emit('input', $event.target.value)"
>
    <ui-select
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
