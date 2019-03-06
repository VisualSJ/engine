'use strict';

export const template = `
<div class="ui-asset"
    @change.stop="$emit('input', translate($event.target.value))"
>
    <ui-drag-object
        :disabled="readonly"
        :dropable="type"
        :value="value ? value.uuid : null"
        :default="dataDefault"

        @click.stop="_onClick($event, value ? value.uuid : null)"
        @dblclick.stop="_onDBClick($event, value ? value.uuid : null)"
    ></ui-drag-object>
</div>
`;

export const props = [
    'readonly',
    'type',
    'dataDefault',
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

    /**
     * 单击资源组件，在 assts 面板上闪烁一下
     * @param event
     * @param uuid
     */
    _onClick(event: any, uuid: string) {
        Editor.Ipc.sendToPanel('assets', 'twinkle', uuid);
    },

    /**
     * 双击资源组件，直接选中该资源
     * @param event
     * @param uuid
     */
    _onDBClick(event: any, uuid: string) {
        Editor.Selection.clear('asset');
        Editor.Selection.select('asset', uuid);
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
