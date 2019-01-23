'use strict';

export const template = `
<div class="ui-curve-range">
    <div class="name">
        <span>{{name}}</span>
        <i class="iconfont icon-lock"
            v-if="value.readonly"
        ></i>
    </div>
    <div class="content">
        <ui-prop auto="true"
            :value="value.mode"
        ></ui-prop>
    </div>

    <div class="object">

        <template
            v-if="value.mode.value == 0"
        >
            <ui-prop auto="true"
                :value="value.constant"
            ></ui-prop>
        </template>

        <template
            v-else-if="value.mode.value == 2"
        >
            <ui-prop auto="true"
                :value="value.curveMin"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.curveMax"
            ></ui-prop>
        </template>

        <template
            v-else-if="value.mode.value == 3"
        >
            <ui-prop auto="true"
                :value="value.constantMin"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.constantMax"
            ></ui-prop>
        </template>

        <template
            v-else
        >
            <ui-prop auto="true"
                :value="value.curve"
            ></ui-prop>
        </template>
    </div>
</div>
`;

export const props = [
    'readonly',
    'name',
    'value',
];

export const components = {
    'ui-prop': require('./ui-prop'),
    'ui-gradient': require('./ui-gradient'),
};

export const methods = {
    _changeMode(mode: number) {
        // @ts-ignore
        const vm: any = this;
        vm.value.mode.value = mode;
    },
};

export const watch = {};

export function data() {
    return {
        style: {
            background: 'linear-gradient(to right, #fff 0%,#fff 100%)',
        },
    };
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;

}

export function destroyed() {

}
