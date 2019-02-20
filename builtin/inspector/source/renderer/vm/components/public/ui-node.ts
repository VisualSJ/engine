'use strict';

export const template = `
<div class="ui-node"
    @change.stop="$emit('input', translate($event.target.value))"
>
    <ui-drag-object
        :disabled="readonly"
        :dropable="type"
        :value="value ? value.uuid : null"
        :default="dataDefault"
    ></ui-drag-object>
</div>
`;

export const props = [
    'readonly',
    'dataDefault',
    'type',
    'value',
];

export const components = {};

export const methods = {
    /**
     * 将 ui-drag-objet 返回的 value 翻译成 dump 数据
     * @param color
     */
    translate(uuid: string) {
        return {
            uuid,
        };
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
