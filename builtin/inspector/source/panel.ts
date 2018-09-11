'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

import { eventBus } from './components/common/event-bus';

let panel: any = null;
let vm: any = null;

const Vue = require('vue/dist/vue.js');
const { getByPath, diffpatcher } = require('./utils');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(join(__dirname, '../static', '/template/index.html'));

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
    getMetaData(meta: any, info: any) {
        const { source, files } = info;
        meta.__name__ = source;
        meta.__src__ = files[0];
        meta.__assetType__ = meta.importer === 'image' ? 'sprite-frame' : '';
        if (meta.subMetas) {
            const arr = [];
            const keys = Object.keys(meta.subMetas);
            for (const key of keys) {
                const value = meta.subMetas[key];
                value.__name__ = key;
                arr.push(value);
            }
            meta.subMetas = arr;
        }
        return meta;
    },
    tearMetaData(meta: any) {
        // todo
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

        if (type === 'asset') {
            const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
            const meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', uuid);

            vm.asset.meta = this.getMetaData(meta, info);
        } else if (type === 'node') {
            const node = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);

            vm.node = node;
        } else {
            vm.type = '';
        }

        vm.currentUuid = uuid;
        vm.loading = false;
    }
};

export const messages = {
    /**
     * 选中某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    async 'selection:select'(this: any, type: string, uuid: string) {
        panel.handleSelect(type, uuid);
    },
    /**
     * 比对节点根据diff结果修改
     * @param {string} uuid
     */
    async 'scene:node-changed'(uuid: string) {
        const { currentUuid } = vm;
        if (uuid === currentUuid) {
            const node = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
            const delta = diffpatcher.diff(vm.node, node);
            if (delta) {
                diffpatcher.patch(vm.node, delta);
            }
        }
    },
    /**
     * 场景已准备
     */
    'scene:ready'() {
        vm.isReady = true;
    }
};

export const listeners = {
    /**
     * 窗口缩放时调用更新
     */
    resize() {
        eventBus.$emit('panel:resize');
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
            isReady: false,
            loading: true,
            type: '',
            currentUuid: '',
            asset: {
                info: null,
                meta: null
            },
            node: {}
        },
        components: {
            asset: require('./components/asset'),
            node: require('./components/node')
        },
        async mounted() {
            const type = await Editor.Ipc.requestToPackage('selection', 'query-last-select-type');
            const uuid = await Editor.Ipc.requestToPackage('selection', 'query-last-select', type);

            vm.isReady = await Editor.Ipc.requestToPackage('scene', 'query-is-ready');

            if (uuid) {
                panel.handleSelect(type, uuid);
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
             */
            async onNodePropertyChange(event: any, index: number | undefined) {
                let prefix;
                if (index !== undefined) {
                    prefix = `comps.${index}`;
                }
                const option: SetPropertyOptions | null = this.getPropertyOption(event, prefix);
                if (option) {
                    this.setProperty(option);
                }
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
                const path = event.target.getAttribute('path') || '';
                const keys = prefix ? `${prefix}.${path}`.split('.') : path.split('.');
                const { type = typeof value } = getByPath(node, keys) || {};
                const key: string = keys.pop();
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
                    uuid,
                    path: keys.join('.'),
                    key,
                    dump
                };
            },
            /**
             * 监听 meta 数据变更
             * @param {*} event
             */
            onMetaChange(event: any) {
                const { value } = event.target;
                const path = event.target.getAttribute('path');

                this.asset.meta[path] = value;
            }
        }
    });
}

export async function beforeClose() {}

export async function close() {}
