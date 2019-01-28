'use strict';

import { shell } from 'electron';

export const template = `
<section class="asset-directory">
    <div class="path">
        <div class="name">
            <span>{{info.source}}</span>
        </div>
        <div class="button">
            <ui-button class="blue explore-btn" tabindex="0"
                @confirm="_onOpenDirectory($event)"
            >
                <i class="iconfont icon-folderopen"></i>
            </ui-button>
        </div>
    </div>

    <div class="content"
        v-if="meta"
    >
        <ui-prop type="boolean"
            :label="t('is_subpackage')"
            :value="meta.userData.isSubpackage"
            @confirm="_onPropertyChanged($event, 'isSubpackage')"
        ></ui-prop>
        <ui-prop type="string"
            v-if="meta.userData.isSubpackage"
            :label="t('subpackage_name')"
            :value="meta.userData.subpackageName"
            @confirm="_onPropertyChanged($event, 'subpackageName')"
        ></ui-prop>
    </div>
</section>
`;

export const props = [
    'info',
    'meta',
];

export const components = {};

export const methods = {
    /**
     * 翻译文本
     * @param key
     */
    t(key: string) {
        return Editor.I18n.t(`inspector.asset.directory.${key}`);
    },

    /**
     * 打开文件夹
     * @param event
     */
    _onOpenDirectory(event: any) {
        // @ts-ignore
        const vm: any = this;
        shell.openItem(vm.info.file);
    },

    /**
     * 修改配置
     * @param event
     * @param key
     */
    _onPropertyChanged(event: any, key: string) {
        // @ts-ignore
        const vm: any = this;
        vm.$set(vm.meta.userData, key, event.target.value);
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {}
