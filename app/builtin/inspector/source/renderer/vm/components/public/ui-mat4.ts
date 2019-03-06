'use strict';

export const template = `
<div class="ui-mat4">

    <div class="name">
        <span
            :title="name"
        >{{name}}</span>
        <i class="iconfont icon-lock"
            v-if="readonly"
        ></i>
    </div>
    <div class="content"></div>

    <div class="mat">
        <div>
            <ui-number
                :readonly="readonly"
                v-model="value.m00"
                :data-default="dataDefault && dataDefault.m00"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m01"
                :data-default="dataDefault && dataDefault.m01"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m02"
                :data-default="dataDefault && dataDefault.m02"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m03"
                :data-default="dataDefault && dataDefault.m03"
            ></ui-number>
        </div>
        <div>
            <ui-number
                :readonly="readonly"
                v-model="value.m04"
                :data-default="dataDefault && dataDefault.m04"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m05"
                :data-default="dataDefault && dataDefault.m05"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m06"
                :data-default="dataDefault && dataDefault.m06"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m07"
                :data-default="dataDefault && dataDefault.m07"
            ></ui-number>
        </div>
        <div>
            <ui-number
                :readonly="readonly"
                v-model="value.m08"
                :data-default="dataDefault && dataDefault.m08"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m09"
                :data-default="dataDefault && dataDefault.m09"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m10"
                :data-default="dataDefault && dataDefault.m10"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m11"
                :data-default="dataDefault && dataDefault.m11"
            ></ui-number>
        </div>
        <div>
            <ui-number
                :readonly="readonly"
                v-model="value.m12"
                :data-default="dataDefault && dataDefault.m12"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m13"
                :data-default="dataDefault && dataDefault.m13"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m14"
                :data-default="dataDefault && dataDefault.m14"
            ></ui-number>
            <ui-number
                :readonly="readonly"
                v-model="value.m15"
                :data-default="dataDefault && dataDefault.m15"
            ></ui-number>
        </div>
    </div>
</div>
`;

export const props = [
    'readonly',
    'name',
    'dataDefault',
    'value',
];

export const components = {
    'ui-number': require('./ui-number'),
};

export const methods = {};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
