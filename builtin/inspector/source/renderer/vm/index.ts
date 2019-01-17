'use strict';

const Vue = require('vue/dist/vue');

export function init(elem: HTMLElement, type: string, uuid: string) {
    const vm = new Vue({
        el: elem,

        data: {
            loading: false, // 是否显示菊花标记
            type: Editor.Project.type, // 当前项目的类型

            item: {
                type: type || '', // 选中物体的类型
                uuid: uuid || '', // 选中物体的 uuid
            },
        },

        components: {
            'asset-3d': require('./components/inspector-3d/asset/index'),
            'node-3d': require('./components/inspector-3d/node/index'),
        },
    });

    vm.$on('set-property', (dump: any) => {
        Editor.Ipc.sendToPanel('scene', 'set-property', {
            uuid: vm.item.uuid,
            path: dump.path,
            dump: {
                type: dump.type,
                value: dump.value,
            },
        });
    });

    return vm;
}
