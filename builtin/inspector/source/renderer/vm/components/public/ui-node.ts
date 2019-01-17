'use strict';

export const template = `
<div class="ui-node">
    <ui-drag-object
        :dropable="type"
        :value="value ? value.uuid : null"
    ></ui-drag-object>
</div>
`;

export const props = [
    'type',
    'value',
];

export const components = {};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
