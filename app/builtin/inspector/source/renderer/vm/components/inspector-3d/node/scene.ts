'use strict';

export const template = `
<div class="scene">
    <div class="header">
        <ui-prop empty="true"
            :value="dump.active"
        >
            <ui-checkbox
                :value="dump.active.value"
                @confirm="dump.active.value = $event.target.value"
                disabled
            ></ui-checkbox>
        </ui-prop>
        <ui-prop empty="true"
            :value="dump.name"
        >
            <ui-input
                :value="dump.name.value"
                @confirm="dump.name.value = $event.target.value"
                placeholder="(scene)"
            ></ui-input>
        </ui-prop>
    </div>
    <template
        v-for="item in dump._globals"
    >
        <ui-section expand v-if="item.visible">
            <div class="header" slot="header">
                <div class="name">
                    <span>{{item.name}}</span>
                </div>
            </div>
            <ui-prop
                v-for="(obj, key) in item.value" :key="key"
                    v-if="obj.visible"
                    auto="true"
                    :value="obj"
                >
            </ui-prop>
        </ui-section>
    </template>
</div>
`;

export const props = [
    'width',
    'height',

    'dump',
    'language',
];

export const components = {
    'ui-object': require('./../../public/ui-object'),
    'ui-prop': require('./../../public/ui-prop'),
};

export const methods = {

};

export const watch = {};

export function data() {
    return {
        unfold: true,
    };
}

export function mounted() {}
