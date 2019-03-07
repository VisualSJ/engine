'use strict';

export const template = `
<div class="light-component">
    <ui-prop auto="true"
        :value="value.value.type"
    ></ui-prop>

    <ui-prop auto="true"
        :value="value.value.color"
    ></ui-prop>

    <ui-prop auto="true"
        :value="value.value.useColorTemperature"
    ></ui-prop>

    <ui-prop auto="true"
        :value="value.value.colorTemperature"
    ></ui-prop>

    <ui-prop auto="true"
        :value="value.value.intensity"
    ></ui-prop>

    <ui-prop auto="true"
        v-if="value.value.type.value > 0"
        :value="value.value.size"
    ></ui-prop>

    <ui-prop auto="true"
        v-if="value.value.type.value > 0"
        :value="value.value.range"
    ></ui-prop>

    <ui-prop auto="true"
        v-if="value.value.type.value > 1"
        :value="value.value.spotAngle"
    ></ui-prop>
</div>
`;

export const props = [
    'width',
    'height',

    'value',
];

export const components: any = {
    'ui-prop': require('../../../public/ui-prop'),
    'node-function': require('./node-function'),
};

export const methods = {
};

export const watch = {
};

export function data() {
    return {
        style: {
            padding: '4px 8px',
            border: '1px dashed #777',
        },
    };
}

export function mounted() {
}
