'use strict';

import { dirname } from 'path';

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

    <template
        v-for="item in images"
    >

        <div class="item">
            <div>
                <span>{{item.name}}</span>
                <div class="button">
                    <ui-button class="blue tiny" tabindex="0"
                        @click="_onBrowseClick($event, item)"
                    >{{t('browse')}}</ui-button>
                </div>
            </div>
            <div>
                <span>origin:</span>
                <ui-input readonly
                    :value="item.origin"
                    :title="item.origin"
                ></ui-input>
            </div>
            <div>
                <span>target:</span>
                <ui-input readonly
                    :value="item.target"
                    :title="item.target"
                ></ui-input>
            </div>
        </div>
    </template>
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

    /**
     * 刷新页面显示数据
     */
    refresh() {
        // @ts-ignore
        const vm: any = this;
        vm.images = [];
        if (!vm.meta || !vm.meta.userData || !vm.meta.userData.imageLocations) {
            return;
        }
        Object.keys(vm.meta.userData.imageLocations).forEach((name) => {
            const item = vm.meta.userData.imageLocations[name];
            vm.images.push({
                name,
                origin: item.originalPath,
                target: item.targetDatabaseUrl,
            });
        });
    },

    /**
     * 点击浏览按钮
     * @param event
     * @param item
     */
    async _onBrowseClick(event: any, item: any) {
        // @ts-ignore
        const vm: any = this;
        const assetInfo = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', vm.info.uuid);
        const assetPath = assetInfo.file;

        // 弹出选择框，让用户选择文件
        const path = dirname(assetPath);
        const config = {
            root: path,
            filters: [{ name: 'Images', extensions: ['jpg', 'png'] }],
        };
        const [ filePath ] = await Editor.Dialog.openFile(config);

        if (!filePath) {
            return;
        }

        if (!filePath.includes(path)) {
            console.warn('can not use external image');
            return;
        }

        const url = await Editor.Ipc.requestToPackage('asset-db', 'query-url-by-path', filePath);
        item.target = url;
        vm.meta.userData.imageLocations[item.name].targetDatabaseUrl = url;
    },
};

export const watch = {
    meta() {
        // @ts-ignore
        this.refresh();
    },
};

export function data() {
    return {
        images: [],
    };
}

export function mounted() {
    // @ts-ignore
    this.refresh();
}
