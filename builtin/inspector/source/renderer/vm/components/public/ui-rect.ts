'use strict';

export const template = `
<div class="ui-rect"
    @change.stop
>
    <ui-vec2
        v-model="value"
    ></ui-vec2>

    <ui-size
        v-model="value"
    ></ui-size>
</div>
`;

export const props = [
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
