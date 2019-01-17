'use strict';

import { readFileSync } from 'fs';

export const template = `
<section class="asset-javascript">
    <ui-prop type="boolean"
        label="导入为插件"
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
     * 更改是否导入成插件的设置
     * @param event
     */
    _onPluginStateChanged(event: any) {
        // @ts-ignore
        const vm: any = this;
        vm.$set(vm.meta.userData, 'isPlugin', event.target.value);
    },
};

export const watch = {};

export function data() {
    return {};
}

export function mounted() {
    // @ts-ignore
    const vm: any = this;

    // todo 需要限制行数
    const text: string = readFileSync(vm.info.file, 'utf8');
    const Hljs = require('highlight.js');
    const result = Hljs.highlight('javascript', text);
    vm.$refs.pre.innerHTML = result.value;
}
