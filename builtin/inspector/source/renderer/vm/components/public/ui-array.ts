'use strict';

export const template = `
<div class="ui-array">
    <div class="name">{{name}}</div>
    <div class="content">
        <ui-num-input path="length"
            :value="value.length"
        ></ui-num-input>
    </div>
    <div class="array">
        <template
            v-for="item in value"
        >
            <ui-prop auto="true"
                :value="item"
            ></ui-prop>
        </template>
    </div>
</div>
`;

export const props = [
    'name',
    'value',
];

export const components = {
    'ui-prop': require('./ui-prop'),
};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
