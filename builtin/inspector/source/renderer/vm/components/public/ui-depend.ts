'use strict';

export const template = `
<div class="ui-depend"
    @change.stop="$emit('input', $event.target.value)"
>

    <div class="name">{{name}}</div>
    <div class="content">
        <ui-checkbox
            :value="unfold"
            @confirm="unfold = !unfold"
        ></ui-checkbox>
    </div>

    <div class="object"
        v-if="unfold && children && children.length"
    >
        <template
            v-for="item in children"
        >
            <ui-prop
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
    'children',
];

export const components = {
    'ui-prop': require('./ui-prop'),
};

export const methods = {};

export const watch = {
    value() {
        // @ts-ignore
        this.unfold = this.value;
    },
};

export function data() {
    return {
        unfold: false,
    };
}

export function mounted() {
    // @ts-ignore
    this.unfold = this.value;
}
