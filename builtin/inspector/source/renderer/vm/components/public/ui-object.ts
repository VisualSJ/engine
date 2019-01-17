'use strict';

export const template = `
<div class="ui-object">

    <div class="name">{{name}}</div>
    <div class="content">
        <span
            :unfold="unfold"
            @click="unfold = !unfold"
        >
            <i class="iconfont fold icon-un-fold foldable"></i>
        </span>
    </div>

    <div class="object"
        v-if="unfold"
    >
        <template
            v-for="item in value"
        >
            <ui-prop
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
    return {
        unfold: false,
    };
}

export function mounted() {}
