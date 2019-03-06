'use strict';

import { readFileSync } from 'fs';

const Hljs = require('highlight.js');

export const template = `
<section class="asset-javascript">
    <ui-prop type="boolean"
        :label="t('plugin')"
        :value="meta && meta.userData.isPlugin"
        @confirm="_onPluginStateChanged($event, 'isPlugin')"
    ></ui-prop>
    <template
        v-if="meta && meta.userData.isPlugin"
    >
        <ui-prop type="boolean"
            :label="t('loadPluginInWeb')"
            :value="meta && meta.userData.loadPluginInWeb"
            @confirm="_onPluginStateChanged($event, 'loadPluginInWeb')"
        ></ui-prop>
        <ui-prop type="boolean"
            :label="t('loadPluginInNative')"
            :value="meta && meta.userData.loadPluginInNative"
            @confirm="_onPluginStateChanged($event, 'loadPluginInNative')"
        ></ui-prop>
        <ui-prop type="boolean"
            :label="t('loadPluginInEditor')"
            :value="meta && meta.userData.loadPluginInEditor"
            @confirm="_onPluginStateChanged($event, 'loadPluginInEditor')"
        ></ui-prop>
    </template>
    <pre class="code" ref="pre"></pre>
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
        return Editor.I18n.t(`inspector.asset.javascript.${key}`);
    },

    /**
     * 更改是否导入成插件的设置
     * @param event
     */
    _onPluginStateChanged(event: any, key: string) {
        // @ts-ignore
        const vm: any = this;
        vm.$set(vm.meta.userData, key, event.target.value);

        if (key === 'isPlugin' && event.target.value) {
            if (!('loadPluginInWeb' in vm.meta.userData)) {
                vm.$set(vm.meta.userData, 'loadPluginInWeb', true);
            }
            if (!('loadPluginInNative' in vm.meta.userData)) {
                vm.$set(vm.meta.userData, 'loadPluginInNative', true);
            }
            if (!('loadPluginInEditor' in vm.meta.userData)) {
                vm.$set(vm.meta.userData, 'loadPluginInEditor', true);
            }
        }
    },

    /**
     * 刷新页面
     */
    refresh() {
        // @ts-ignore
        const vm: any = this;

        if (!vm.info || vm.info.importer !== 'javascript') {
            return;
        }

        // TODO 需要限制行数
        const text: string = readFileSync(vm.info.file, 'utf8');
        const result = Hljs.highlight('javascript', text);
        vm.$refs.pre.innerHTML = result.value;
    },
};

export const watch = {
    info() {
        // @ts-ignore
        this.refresh();
    },
};

export function data() {
    return {};
}

export function mounted() {
    // @ts-ignore
    this.refresh();
}
