'use strict';

export const template = `
<div class="ui-depend">
    <div class="name">
        <span
            :title="name"
        >{{name}}</span>
        <i class="iconfont icon-lock"
            v-if="value.readonly"
        ></i>
    </div>
    <div class="content">
        <ui-checkbox
            :readonly="readonly"
            :value="value"
            @confirm="$emit('input', !value)"
        ></ui-checkbox>
    </div>

    <div class="object"
        v-if="value && children && children.length"
    >
        <template
            v-for="item in children"
        >
            <ui-prop auto="true"
                :readonly="readonly"
                :value="item.dump"

                :width="width"
                :height="height"
            ></ui-prop>
        </template>
    </div>
</div>
`;

export const props = [
    'readonly',
    'width',
    'height',

    'name',
    'value',
    'children',
];

export const components = {
    'ui-prop': require('./ui-prop'),
};

export const methods = {};

export const watch = {};

export function data() {
    return {
        unfold: false,
    };
}

export function mounted() {
    // @ts-ignore
    this.unfold = this.value;
}
