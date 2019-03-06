'use strict';

import { readFileSync } from 'fs';

const Hljs = require('highlight.js');

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

export const methods = {
    refresh() {
        // @ts-ignore
        const vm: any = this;

        if (!vm.info || vm.info.importer !== 'effect') {
            return;
        }

        // TODO 需要限制行数
        const text: string = readFileSync(vm.info.file, 'utf8');
        const result = Hljs.highlight('glsl', text);
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
