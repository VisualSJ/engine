'use strict';

export const template = `
<div class="avatar-model-component">
    <div>
        <ui-prop
            :value="operation"
        >
            <ui-button class="green"
                :style="style"
                @confirm="_onApplyClick($event)"
            >Apply</ui-button>
        </ui-prop>
    </div>

    <div class="content"
        v-for="item in shortProp(value.value)"
        v-if="item.visible"
    >
        <ui-prop auto="true"
            :value="item"

            :width="width"
            :height="height"
        ></ui-prop>
    </div>
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

    shortProp(list: any[]) : any {
        // @ts-ignore
        return this.$parent.shortProp(list);
    },

    _onApplyClick() {
        Editor.Ipc.requestToPackage('scene', 'excute-component-method', {
            // @ts-ignore
            uuid: this.value.value.uuid.value, 
            name: 'combine',
            args: [],
        });
    },
};

export const watch = {
};

export function data() {
    return {
        operation: {
            name: 'Operation',
        },
        style: {
            lineHeight: '14px',
        },
    };
}

export function mounted() {
}

export function beforeDestroy() {
    // @ts-ignore
    // this._onApplyClick();
}
