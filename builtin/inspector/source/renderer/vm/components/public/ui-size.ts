'use strict';

export const template = `
<div class="ui-size">
    <ui-number name="W"
        v-model="value.width"
    ></ui-number>
    <ui-number name="H"
        v-model="value.height"
    ></ui-number>
</div>
`;

export const props = [
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
