'use strict';

export const template = `
<div class="silder-component">
    <ui-prop auto="true"
        :value="value.value.handle"
    ></ui-prop>
    <ui-prop auto="true"
        :value="value.value.direction"
    ></ui-prop>
    <ui-prop auto="true"
        :value="value.value.progress"
    ></ui-prop>

    <ui-prop empty="true" class="ui-array"
        :value="value.value.slideEvents"
    >
        <div class="name">{{value.value.slideEvents.name}}</div>
        <div class="content">
            <ui-num-input path="length"
                :value="value.value.slideEvents.value.length"
            ></ui-num-input>
        </div>
        <div class="array">
            <template
                v-for="item in value.value.slideEvents.value"
            >
                <ui-prop empty="true"
                    :value="item"
                >
                    <node-function class="ui-object"
                        :value="item"
                    ></node-function>
                </ui-prop>
            </template>
        </div>
    </ui-prop>
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
