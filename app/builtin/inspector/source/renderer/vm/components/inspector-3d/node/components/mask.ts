'use strict';

export const template = `
<div class="mask-component">
    <ui-prop auto="true"
        :value="value.value.type"
    ></ui-prop>
    <ui-prop auto="true"
        v-show="value.value.type.value == '1'"
        :value="value.value.segments"
    ></ui-prop>
    <ui-prop auto="true"
        :value="value.value.priority"
    ></ui-prop>
    <ui-prop auto="true"
        :value="value.value.sharedMaterial"
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
};
