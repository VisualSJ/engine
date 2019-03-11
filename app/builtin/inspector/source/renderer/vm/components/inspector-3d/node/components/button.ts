'use strict';

export const template = `
<div class="button-component">
    <ui-prop auto="true"
        :value="value.value.target"
    ></ui-prop>
    <ui-prop auto="true"
        :value="value.value.interactable"
    ></ui-prop>
    <ui-prop auto="true"
        :value="value.value.transition"
    ></ui-prop>

    <div
        :style="style"
        v-if="value.value.transition.value != 0"
    >
        <template
            v-if="value.value.transition.value == 1"
        >
            <ui-prop auto="true"
                :value="value.value.normalColor"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.value.pressedColor"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.value.hoverColor"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.value.disabledColor"
            ></ui-prop>
        </template>

        <template
            v-else-if="value.value.transition.value == 2"
        >
            <ui-prop auto="true"
                :value="value.value.normalSprite"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.value.pressedSprite"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.value.hoverSprite"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.value.disabledSprite"
            ></ui-prop>
        </template>

        <template
            v-else-if="value.value.transition.value == 3"
        >
            <ui-prop auto="true"
                :value="value.value.zoomScale"
            ></ui-prop>
            <ui-prop auto="true"
                :value="value.value.duration"
            ></ui-prop>
        </template>
    </div>
    <ui-prop auto="true"
        :value="value.value.clickEvents"
        :readonly="value.value.clickEvents.readonly"
    >
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
