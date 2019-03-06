'use strict';

export const template = `
<div class="ui-unknown">
    <span>Unknown Type</span>
    <span class="reset"
        @click="_onClick"
    >Reset</span>
</div>
`;

export const props = [
    'readonly',

    'value',
];

export const components = {};

export const methods = {

    /**
     * 点击创建对应的数据
     */
    _onClick() {
        const event = document.createEvent('HTMLEvents');
        event.initEvent('confirm', true, true);
        // @ts-ignore
        this.$el.dispatchEvent(event);
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
