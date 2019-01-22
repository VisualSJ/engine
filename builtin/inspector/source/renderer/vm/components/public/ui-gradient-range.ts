'use strict';

export const template = `
<div class="ui-gradient-range">
    <div class="name">{{name}}</div>
    <div class="content">

        <ui-prop empty="true"
            :value="value.mode"
        >
            <template
                v-if="value.mode.value === 0"
            >
                <ui-button class="green transparent">Color</ui-button>
                <ui-button class="red transparent"
                    @confirm="value.mode.value = 1"
                >Gradient</ui-button>
            </template>

            <template
                v-else
            >
                <ui-button class="red transparent"
                    @confirm="value.mode.value = 0"
                >Color</ui-button>
                <ui-button class="green transparent">Gradient</ui-button>
            </template>
        </ui-prop>
    </div>

    <div class="object">

        <template
            v-if="value.mode.value === 0"
        >
            <ui-prop auto="true"
                :value="value.color"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.colorMax"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.colorMin"
            ></ui-prop>
        </template>

        <template
            v-else
        >
            <ui-prop auto="true"
                :value="value.gradient"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.gradientMax"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.gradientMin"
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
