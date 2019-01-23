'use strict';

export const template = `
<div class="ui-rect">
    <ui-vec2
        :readobly="readonly"
        v-model="value"
    ></ui-vec2>

    <ui-size
        :readobly="readonly"
        v-model="value"
    ></ui-size>
</div>
`;

export const props = [
    'readonly',

    'value',
];

export const components = {
    'ui-vec2': require('./ui-vec2'),
    'ui-size': require('./ui-size'),
};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
