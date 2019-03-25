'use strict';

export const template = `
<div class="sphere-light-component"
    v-if="value && value.value"
>
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
        :value="value.value.size"
    ></ui-prop>

    <ui-prop auto="true"
        :value="value.value.range"
    ></ui-prop>

    <ui-prop auto="true"
        :value="value.value.spotAngle"
    ></ui-prop>

    <ui-prop auto="true"
        :value="value.value.useLuminance"
    ></ui-prop>
    
    <ui-prop auto="true"
        v-if="value.value.useLuminance.value"
        :value="value.value.luminance"
    ></ui-prop>
    
    <ui-prop auto="true"
        v-if="!value.value.useLuminance.value"
        :value="value.value.luminousPower"
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
