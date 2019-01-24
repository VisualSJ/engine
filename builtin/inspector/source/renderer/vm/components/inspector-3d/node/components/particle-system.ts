'use strict';

export const template = `
<div class="particle-system-component">
    <template
        v-for="name in preArray"
    >
        <ui-prop auto="true"
            :value="value.value[name]"
        ></ui-prop>
    </template>

    <template
        v-for="item in value.value"
    >
        <ui-prop auto="true"
            v-if="item.visible && !preArray.includes(item.name) && !postArray.includes(item.name)"
            :value="item"
        ></ui-prop>
    </template>

    <template
        v-for="name in postArray"
    >
        <ui-prop auto="true"
            :value="value.value[name]"
        ></ui-prop>
    </template>
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

export const methods = {
};

export const watch = {
};

export function data() {
    return {
        preArray: [
            'renderer',
        ],

        postArray: [
            'gravityModifier',
            'rateOverDistance',
            'rateOverTime',
            'startColor',
            'startDelay',
            'startLifetime',
            'startRotation',
            'startSize',
            'startSpeed',

            'colorOverLifetimeModule',
            'forceOvertimeModule',
            'limitVelocityOvertimeModule',
            'rotationOvertimeModule',
            'shapeModule',
            'sizeOvertimeModule',
            'textureAnimationModule',
            'velocityOvertimeModule',
        ],
    };
}

export function mounted() {
}
