'use strict';

export const template = `
<div class="toggle-component">
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
        :value="value.value.isChecked"
    ></ui-prop>

    <ui-prop auto="true"
        :value="value.value.toggleGroup"
    ></ui-prop>

    <ui-prop empty="true" class="ui-array"
        :value="value.value.clickEvents"
    >
        <div class="name">{{value.value.clickEvents.name}}</div>
        <div class="content">
            <ui-num-input path="length"
                :value="value.value.clickEvents.value.length"
            ></ui-num-input>
        </div>
        <div class="array">
            <template
                v-for="item in value.value.clickEvents.value"
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
