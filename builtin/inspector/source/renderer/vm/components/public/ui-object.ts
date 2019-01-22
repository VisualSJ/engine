'use strict';

export const template = `
<div class="ui-object">

    <div class="name">{{name}}</div>
    <div class="content">
        <template
            v-if="value.enable && value.enable.type === 'Boolean'"
        >
            <ui-prop empty="true"
                :value="value.enable"
            >
                <ui-checkbox
                    :value="value.enable.value"
                    @change="unfold = $event.target.value"
                    @confirm="value.enable.value = $event.target.value"
                ></ui-checkbox>
            </ui-prop>
        </template>
        <template
            v-else
        >
            <span
                :unfold="unfold"
                @click="unfold = !unfold"
            >
                <i class="iconfont fold icon-un-fold foldable"></i>
            </span>
        </template>
    </div>

    <div class="object"
        v-if="unfold"
    >
        <template
            v-for="item in value"
            v-if="item.name !== 'enable' || item.type !== 'Boolean'"
        >
            <ui-prop auto="true"
                :value="item"

                :width="width"
                :height="height"
            ></ui-prop>
        </template>
    </div>
</div>
`;

export const props = [
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
