'use strict';

import { basename } from 'path';

export const template = `
<header class="asset-header">
    <div class="name">
        {{name}}
    </div>

    <ui-button class="tiny red transparent"
        :disabled="!dirty"
        @click="dirty && $emit('reset', $event)"
    >
        <i class="iconfont icon-close-b"></i>
    </ui-button>

    <ui-button class="tiny green transparent"
        :disabled="!dirty"
        @click="dirty && $emit('apply', $event)"
    >
        <i class="iconfont icon-check-b"></i>
    </ui-button>
</header>
`;

export const props = [
    'info',
    'dirty',
];

export const components = {};

export const methods = {};

export const watch = {
    /**
     * info 更新的时候需要更新显示的名字
     */
    info(info: any) {
        const vm: any = this;
        if (info.file) {
            vm.name = basename(info.file);
            return;
        }

        const split = info.uuid.split('@');
        if (split.length >= 2 && split[split.length - 1]) {
            vm.name = split[split.length - 1];
            return;
        }

        vm.name = 'Unknown';
    },
};

export function data() {
    return {
        name: 'Unknown',
    };
}

export function mounted() {}
