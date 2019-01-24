'use strict';

import { readFileSync } from 'fs';

const Hljs = require('highlight.js');

export const template = `
<section class="asset-javascript">
    <ui-prop type="boolean"
        :label="t('plugin')"
        :value="meta && meta.userData.isPlugin"
        @confirm="_onPluginStateChanged($event)"
    ></ui-prop>
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
    _onPluginStateChanged(event: any) {
        // @ts-ignore
        const vm: any = this;
        vm.$set(vm.meta.userData, 'isPlugin', event.target.value);
    },
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
