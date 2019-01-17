'use strict';

import { readFileSync } from 'fs';

export const template = `
<section class="asset-effect">
    <pre class="code" ref="pre"></pre>
</section>
`;

export const props = [
    'info',
    'meta',
];

export const components = {};

export const methods = {};

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
    const result = Hljs.highlight('glsl', text);
    vm.$refs.pre.innerHTML = result.value;
}
