'use strict';

export const template = `
<div class="ui-vec3">
    <ui-number name="X"
        :readonly="readonly"
        v-model="value.x"
        :data-default="dataDefault && dataDefault.x"
    ></ui-number>
    <ui-number name="Y"
        :readonly="readonly"
        v-model="value.y"
        :data-default="dataDefault && dataDefault.y"
    ></ui-number>
    <ui-number name="Z"
        :readonly="readonly"
        v-model="value.z"
        :data-default="dataDefault && dataDefault.z"
    ></ui-number>
</div>
`;

export const props = [
    'readonly',
    'dataDefault',
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
