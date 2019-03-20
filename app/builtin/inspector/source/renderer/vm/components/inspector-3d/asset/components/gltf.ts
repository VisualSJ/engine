'use strict';

export const template = `
<section class="asset-fbx">

    <ui-prop class="type"
        label="DumpMaterial"
    >
        <ui-checkbox slot="content"
            :value="meta ? meta.userData.dumpMaterials : false"
            @confirm="_onDataChanged($event, 'dumpMaterials')"
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

    /**
     * 更改图片的导入类型
     */
    _onDataChanged(event: any, key: string) {
        // @ts-ignore
        const vm: any = this;
        vm.meta.userData[key] = event.target.value;
    },

    /**
     * 翻译文本
     * @param key
     */
    t(key: string) {
        return Editor.I18n.t(`inspector.asset.fbx.${key}`);
    },
};

export const watch = {};

export function data() {}

export function mounted() {}
