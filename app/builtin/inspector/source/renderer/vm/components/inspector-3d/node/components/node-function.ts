'use strict';

export const template = `
<div class="node-function">
    <div class="name">{{value.name}}</div>
    <div class="content">
        <span
            :unfold="unfold"
            @click="unfold = !unfold"
        >
            <i class="iconfont fold icon-un-fold foldable"></i>
        </span>
    </div>
    <div class="object"
        v-if="unfold"
    >
        <div style="display: flex; padding-top: 10px;">

            <ui-prop empty="true" style="padding-top: 0; flex: 1; margin-right: 10px;"
                :value="value.value.target"
            >
                <ui-drag-object
                    :dropable="value.value.target.type"
                    :value="value.value.target.value.uuid"
                    @confirm="value.value.target.value.uuid = $event.target.value"
                ></ui-drag-object>
            </ui-prop>

            <ui-prop empty="true" style="flex: 1; margin-right: 10px;"
                :value="value.value._componentName"
            >
                <ui-select style="width: 100%;"
                    :value="value.value._componentName.value"
                    @confirm="value.value._componentName.value = $event.target.value"
                >
                    <option
                        v-for="(item,name) in components"
                    >{{name}}</option>
                </ui-select>
            </ui-prop>

            <ui-prop empty="true" style="flex: 1;"
                :value="value.value.handler"
            >
                <ui-select style="width: 100%;"
                    :value="value.value.handler.value"
                    @confirm="value.value.handler.value = $event.target.value"
                >
                    <template
                        v-if="components[value.value._componentName.value]"
                    >
                        <option
                            v-for="item in components[value.value._componentName.value]"
                        >{{item}}</option>
                    </template>
                </ui-select>
            </ui-prop>
        </div>

        <ui-prop auto="true"
            :value="value.value.customEventData"
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
    async updateComponent(uuid: string) {
        // @ts-ignore
        const vm: any = this;

        if (!uuid) {
            vm.components = {};
            return;
        }

        const result = await Editor.Ipc.requestToPackage('scene', 'query-component-function-of-node', uuid);

        vm.components = result;
    },
};

export const watch = {
    async 'value.value.target.value.uuid'(uuid: string) {
        // @ts-ignore
        const vm: any = this;
        vm.updateComponent(uuid);
    },
};

export function data() {
    return {
        unfold: false,
        components: {},
    };
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;
    if (vm.value && vm.value.value.target.value.uuid) {
        vm.updateComponent(vm.value.value.target.value.uuid);
    }
}
