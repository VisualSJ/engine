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

            // template 内使用
            state: {
                db: 'close',
                scene: 'close',
            },

            item: {
                type: '', // 选中物体的类型
                uuids: [], // 选中物体的 uuid 列表
            },

            width: 0,
            height: 0,
            language: 'default',
        },
        watch: {
            item: {
                deep: true,
                handler(item: any) {
                    // @ts-ignore
                    const vm: any = this;
                    if (item.type === 'asset' && vm.$refs.node) {
                        vm.$refs.node.break();
                    }
                    if (item.type === 'node' && vm.$refs.asset) {
                        vm.$refs.asset.break();
                    }
                },
            },
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
        vm.item.uuids.forEach((uuid: string) => {
            Editor.Ipc.sendToPanel('scene', 'set-property', {
                uuid,
                path: dump.path,
                dump: {
                    type: dump.type,
                    isArray: dump.isArray,
                    value: dump.value,
                },
            });
        });
    });

    return vm;
}
