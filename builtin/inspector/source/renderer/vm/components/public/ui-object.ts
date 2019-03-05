'use strict';

export const template = `
<div class="ui-object">
    <div class="name">
        <span
            :title="name"
        >{{name}}</span>
        <i class="iconfont icon-lock"
            v-if="readonly"
        ></i>
    </div>
    <div class="content">
        <span
            :unfold="unfold"
            @click="unfold = !unfold"
        >
            <i :class="['iconfont', 'fold', 'foldable', unfold ? 'icon-collapse' : 'icon-expand']"></i>
        </span>
    </div>

    <div class="object"
        v-if="unfold"
    >
        <template
            v-for="item in value"
        >
            <ui-prop auto="true"
                v-if="item.visible"
                :value="item"

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
    const vm: any = this;
    if (vm.value.enable) {
        vm.unfold = vm.value.enable.value;
    }
}
