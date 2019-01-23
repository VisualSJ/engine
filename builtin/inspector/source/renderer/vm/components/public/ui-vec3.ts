'use strict';

export const template = `
<div class="ui-vec3">
    <ui-number name="X"
        :readonly="readonly"
        v-model="value.x"
    ></ui-number>
    <ui-number name="Y"
        :readonly="readonly"
        v-model="value.y"
    ></ui-number>
    <ui-number name="Z"
        :readonly="readonly"
        v-model="value.z"
    ></ui-number>
</div>
`;

export const props = [
    'readonly',

    'value',
];

export const components = {
    'ui-number': require('./ui-number'),
};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
