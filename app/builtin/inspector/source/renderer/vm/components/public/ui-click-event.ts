'use strict';

export const template = `
<div class="click-event">
    <div class="ui-prop line">
    <ui-drag-object
        :dropable="value.target.type"
        :value="value.target.value.uuid"
        @confirm="value.target.value.uuid = $event.target.value"
    ></ui-drag-object>
    <ui-select
        :value="value._componentName.value"
        @confirm="value._componentName.value = $event.target.value"
    >
        <option
            v-for="(item,name) in components"
        >{{name}}</option>
    </ui-select>
    <ui-select
        :value="value.handler.value"
        @confirm="value.handler.value = $event.target.value"
    >
        <template
            v-if="components[value._componentName.value]"
        >
            <option
                v-for="item in components[value._componentName.value]"
            >{{item}}</option>
        </template>
    </ui-select>
    </div>
    <ui-prop auto="true"
        :value="value.customEventData"
    ></ui-prop>
</div>
`;

export const props = [
    'width',
    'height',

    'value',
];

export const components: any = {
    'ui-prop': require('./ui-prop'),
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
    async 'value.target.value.uuid'(uuid: string) {
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
    if (vm.value && vm.value.target.value.uuid) {
        vm.updateComponent(vm.value.target.value.uuid);
    }
}
