'use strict';

const Vue = require('vue/dist/vue');

Vue.config.productionTip = false;
Vue.config.devtools = false;

export function init(elem: HTMLElement) {
    const vm = new Vue({
        el: elem,

        data: {
            loading: false, // 是否显示菊花标记
            type: Editor.Project.type, // 当前项目的类型

            state: {
                db: 'close',
                scene: 'close',
            },

            item: {
                type: '', // 选中物体的类型
                uuid: '', // 选中物体的 uuid
            },

            width: 0,
            height: 0,
            language: 'default',
        },

        methods: {
            resize() {
                // @ts-ignore
                const rect = this.$el.getBoundingClientRect();
                // @ts-ignore
                this.width = rect.width;
                // @ts-ignore
                this.height = rect.height;
            },
            /**
             * 数据重置
             */
            reset(event: any) {
                const target = event.target;
                const value: any = target.getAttribute('default');
                // 没有默认值则不作处理
                if (value === undefined || value === null) {
                    return;
                }
                target.setAttribute('value', value);
                target.dispatch && target.dispatch('change');
            },
        },

        components: {
            'asset-3d': require('./components/inspector-3d/asset/index'),
            'node-3d': require('./components/inspector-3d/node/index'),
        },

        mounted() {
            this.resize();
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
