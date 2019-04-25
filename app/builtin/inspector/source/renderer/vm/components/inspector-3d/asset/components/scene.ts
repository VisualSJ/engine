'use strict';

export const template = `
<section class="asset-scene">
    <ui-prop class="asyncLoadAssets"
        label="AsyncLoadAssets"
    >
        <ui-checkbox slot="content"
            :value="meta ? meta.userData.asyncLoadAssets : false"
            @confirm="_onDataChanged($event, 'asyncLoadAssets')"
        ></ui-checkbox>
    </ui-prop>
</section>
`;

export const props = [
    'info',
    'meta',
];

export const components = {};

export const methods = {
    _onDataChanged(event: any, key: string) {
        // @ts-ignore
        const vm: any = this;
        vm.meta.userData[key] = event.target.value;
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;
}
