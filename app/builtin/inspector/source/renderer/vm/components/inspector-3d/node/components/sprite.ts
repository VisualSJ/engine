'use strict';

export const template = `
<div class="sprite-component">
    <ui-prop auto="true"
        :value="value.value.type"
    ></ui-prop>
    <div v-show="value.value.type.value == '3'">
        <ui-prop auto="true"
            :value="value.value.fillType"
        ></ui-prop>
        <div class="ui-prop" type="cc.Vec2">
            <div class="name">
                <span
                    :title="getName(value.value.fillCenter.name)"
                >{{getName(value.value.fillCenter.name)}}</span>
            </div>
            <div class="content">
                <ui-vec2
                    :readonly="value.value.fillType.value == '0'"
                    v-model="value.value.fillCenter.value"
                    :data-default="value.value.fillCenter.default"
                ></ui-vec2>
            </div>
        </div>
        <ui-prop auto="true"
            :value="value.value.fillStart"
        ></ui-prop>
        <ui-prop auto="true"
            :value="value.value.fillRange"
        ></ui-prop>
    </div>
    <ui-prop auto="true"
        v-for="(item,index) in mainData"
        :key="index"
        :value="item"
    ></ui-prop>
</div>
`;

export const props = [
    'width',
    'height',

    'value',
];

export const components: any = {
    'ui-prop': require('../../../public/ui-prop'),
    'ui-vec2': require('../../../public/ui-vec2'),
    'node-function': require('./node-function'),
};

export const methods = {
    /**
     * 根据 dump 数据，获取名字
     */
    getName(name: string) {
        if (!name) {
            return '';
        }
        name = name.replace(/^\S/, (str: string) => str.toUpperCase());
        name = name.replace(/_/g, (str: string) => ' ');
        name = name.replace(/ \S/g, (str: string) => ` ${str.toUpperCase()}`);
        return name;
    },
};

const filters = ['fillCenter', 'fillRange', 'fillStart', 'fillType', 'type'];

export const computed = {
    mainData() {
        const mainData: any = {};
        // @ts-ignore
        for (const name of Object.keys(this.value.value)) {
            // @ts-ignore
            const item = this.value.value[name];
            if (filters.indexOf(name) === -1 && item.visible) {
                mainData[name] = item;
            }
        }
        return mainData;
    },
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
export function mounted(this: any) {

}
