'use strict';

export const template = `
<div class="ui-null">
    <span class="info">Null</span>
    <span class="create"
        @click="_onClick"
    >Create</span>
</div>
`;

export const props = [
    'readonly',

    'type',
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
