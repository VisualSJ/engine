'use strict';

export const template = `
<div class="ui-size">
    <ui-number name="W"
        :readobly="readonly"
        v-model="value.width"
    ></ui-number>
    <ui-number name="H"
        :readobly="readonly"
        v-model="value.height"
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
