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

    <ui-prop class="type"
        label="Normals"
    >
        <ui-select slot="content"
            :value="meta ? meta.userData.normals : 0"
            @confirm="_onDataChanged($event, 'normals', 'number')"
        >
            <option value="0">Optional</option>
            <option value="1">Exclude</option>
            <option value="2">Require</option>
            <option value="3">recalculate</option>
        </ui-select>
    </ui-prop>

    <ui-prop class="type"
        label="Tangents"
    >
        <ui-select slot="content"
            :value="meta ? meta.userData.tangents : 0"
            @confirm="_onDataChanged($event, 'tangents', 'number')"
        >
            <option value="0">Optional</option>
            <option value="1">Exclude</option>
            <option value="2">Require</option>
            <option value="3">Recalculate</option>
        </ui-select>
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
    _onDataChanged(event: any, key: string, type?: string) {
        // @ts-ignore
        const vm: any = this;

        let value = event.target.value;

        switch (type) {
            case 'number':
                value -= 0;
                break;
        }

        vm.meta.userData[key] = value;
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
