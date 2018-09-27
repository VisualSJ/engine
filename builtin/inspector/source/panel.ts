'use strict';

import { readFileSync } from 'fs';
import { basename, extname, join } from 'path';

import { eventBus } from './utils/event-bus';

const Vue = require('vue/dist/vue.js');
const { getByPath, diffpatcher, repairPath } = require('./utils');

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

/**
 * 配置 inspector 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'inspector',
        file: 'packages://inspector/static/iconfont.woff'
    }
];

export const $ = {
    content: '.content'
};

export const methods = {
    /**
     * 通过结合 meta 和 info 数据返回最终需要的 meta 信息
     * @param {*} meta
     * @param {*} info
     * @returns
     */
    getMetaData() {
        const { originInfo, originMeta } = vm;
        const { source = '', files = [] } = originInfo;
        const meta: any = {};

        meta.__name__ = basename(source, extname(source));
        meta.__src__ = files[0];
        meta.__assetType__ = originMeta.importer;

        if (originMeta.userData) {
            const { userData } = originMeta;
            const keys = Object.keys(userData);
            for (const key of keys) {
                meta[key] = userData[key];
            }
        }
        if (originMeta.subMetas) {
            const arr = [];
            const { subMetas } = originMeta;
            const keys = Object.keys(subMetas);
            for (const key of keys) {
                const value = subMetas[key];
                value.__name__ = key;
                arr.push(value);
            }
            meta.subMetas = arr;
        }

        return meta;
    },

    /**
     * inspector 根据当前选中对象的 type 以及 uuid 进行对应的界面渲染
     * @param {string} type
     * @param {string} uuid
     */
    async handleSelect(type: string, uuid: string) {
        if (vm.currentUuid === uuid) {
            return;
        }

        vm.loading = true;
        vm.type = type;
        vm.currentUuid = uuid;

        if (type === 'asset') {
            try {
                const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
                const meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', uuid);
                vm.node = null;
                vm.originMeta = meta;
                vm.originInfo = info;
                vm.meta = panel.getMetaData();
            } catch (err) {
                vm.type = '';
                vm.currentUuid = '';
                console.error(err);
            }
        } else if (type === 'node') {
            try {
                const node = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
                vm.meta = null;
                vm.node = node;
            } catch (err) {
                vm.type = '';
                vm.currentUuid = '';
                console.error(err);
            }
        } else {
            vm.type = '';
        }

        vm.loading = false;
    }
};

export const messages = {
    /**
     * 选中某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    async 'selection:select'(type: string, uuid: string) {
        panel.handleSelect(type, uuid);
    },

    /**
     * 比对节点根据diff结果修改
     * @param {string} uuid
     */ async 'scene:node-changed'(uuid: string) {
        if (vm) {
            const { currentUuid } = vm;
            if (uuid === currentUuid) {
                try {
                    const node = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
                    const delta = diffpatcher.diff(vm.node, node);
                    if (delta) {
                        diffpatcher.patch(vm.node, delta);
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        }
    },

    /**
     * 场景已准备
     */
    'scene:ready'() {
        vm && (vm.isSceneReady = true);
    },

    /**
     * 移除数组元素
     * @param {RemoveArrayOptions} options
     */
    async 'remove-array-element'(options: RemoveArrayOptions) {
        try {
            const result = await Editor.Ipc.requestToPackage('scene', 'remove-array-element', options);
        } catch (err) {
            console.error(err);
        }
    },

    /**
     * 移动一个数组类型的元素位置
     * @param {MoveArrayOptions} options
     */
    async 'move-array-element'(options: MoveArrayOptions) {
        try {
            const result = await Editor.Ipc.requestToPackage('scene', 'move-array-element', options);
        } catch (err) {
            console.error(err);
        }
    },

    /**
     * 创建一个组件并挂载到指定的 entity 上
     * @param {CreateComponentOptions} options
     */
    async 'create-component'(options: CreateComponentOptions) {
        try {
            const result = await Editor.Ipc.requestToPackage('scene', 'create-component', options);
        } catch (err) {
            console.error(err);
        }
    },

    /**
     * 移除一个 entity 上的指定组件
     * @param {RemoveComponentOptions} options
     */
    async 'remove-component'(options: RemoveComponentOptions) {
        try {
            const result = await Editor.Ipc.requestToPackage('scene', 'create-component', options);
        } catch (err) {
            console.error(err);
        }
    }
};

export const listeners = {
    /**
     * 窗口缩放时调用更新
     */
    resize() {
        eventBus.emit('panel:resize');
    }
};

export async function ready() {
    // @ts-ignore
    panel = this;

    // 初始化 vue
    vm = new Vue({
        el: panel.$.content,

        data: {
            // 标记场景是否 ready
            isSceneReady: false,
            loading: true,
            type: '',
            currentUuid: '',
            meta: null,
            node: null,
            currentComponent: 'component-2d'
        },

        components: { 'component-2d': require('./2d') },

        async mounted() {
            try {
                const type = await Editor.Ipc.requestToPackage('selection', 'query-last-select-type');
                const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', type);

                vm.isSceneReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');

                if (uuid) {
                    panel.handleSelect(type, uuid);
                }
            } catch (err) {
                console.error('error');
            }
        },

        computed: {
            /**
             * 判断 inspector 是否可以显示界面
             * @returns {boolean}
             */
            isReady(this: any): boolean {
                return !this.loading && this.isSceneReady && (this.node || this.meta);
            }
        },

        methods: <any>{
            /**
             * 发送属性修改请求
             * @param {SetPropertyOptions} option
             * @returns
             */
            async setProperty(option: SetPropertyOptions) {
                try {
                    await Editor.Ipc.sendToPanel('scene', 'set-property', option);
                } catch (err) {
                    console.error(err);
                }
            },

            /**
             * 监听属性变更
             * @param {*} event
             * @param {(number | undefined)} index
             */ async onNodePropertyChange(event: any, index: number | undefined) {
                let prefix;
                if (index !== undefined) {
                    prefix = `__comps__.${index}`;
                }
                const option: SetPropertyOptions | null = this.getPropertyOption(event, prefix);
                if (option) {
                    this.setProperty(option);
                }
            },

            /**
             * 返回可能嵌套的 ui-prop 的 path 值
             * @param {*} event
             * @param {(string | undefined)} prefix
             * @returns
             */
            getPath(event: any, prefix: string | undefined) {
                const { path: eventPath } = event;
                let paths = event.target.getAttribute('path');

                if (!paths || eventPath.some((item: HTMLElement) => item.tagName === 'UI-PROP')) {
                    paths = (event.path || [])
                        .filter((item: HTMLElement) => item.tagName === 'UI-PROP')
                        .reduceRight((prev: any, next: HTMLElement, i: number, arr: HTMLElement[]) => {
                            const path = next.getAttribute('path');
                            return path ? `${prev && prev + '.'}${path}` : prev;
                        }, '');
                }

                return prefix ? `${prefix}.${paths}` : paths;
            },

            /**
             * 获取设置node属性需要的选项,path不存在则返回null
             * @param {object} event
             * @param {(string | undefined)} prefix
             * @returns [null | SetPropertyOptions]
             */
            getPropertyOption(event: any, prefix: string | undefined): SetPropertyOptions | null {
                const node: NodeDump = this.node;
                const { value } = event.target;
                const { value: uuid } = node.uuid;
                const path = this.getPath(event, prefix);
                const { type = typeof value } = getByPath(node, path) || {};
                const dump: PropertyDump = { type, value, extends: [] };
                // path不存在则返回 null
                if (!path) {
                    return null;
                }
                // color4的取值范围是0-1，精度为0.1，超出精度的值目前会导致设置无效
                if (type === 'color4' || type === 'color3') {
                    dump.value = dump.value.map(
                        (item: number, index: number) => (index === 3 ? item : Math.round((item * 10) / 255) / 10)
                    );
                }
                return {
                    // 对dump属性名进行恢复
                    path: repairPath(path),
                    uuid,
                    dump
                };
            },

            /**
             * 监听 meta 数据变更
             * @param {*} event
             */ onMetaChange(event: any) {
                // todo
            }
        }
    });
}

export async function beforeClose() {}

export async function close() {}
