'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

let panel: any = null;
let vm: any = null;

const Vue = require('vue/dist/vue.js');
const { getByPath, diffpatcher } = require('./utils');

export const style = readFileSync(join(__dirname, '../dist/index.css'));

export const template = readFileSync(
    join(__dirname, '../static', '/template/index.html')
);

export const $ = {
    content: '.content'
};

export const methods = {};

export const messages = {
    /**
     * 选中某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    async 'selection:select'(type: string, uuid: string) {
        vm.loading = true;

        if (type === 'asset') {
            const info = await Editor.Ipc.requestToPackage(
                'asset-db',
                'query-asset-info',
                uuid
            );
            const meta = await Editor.Ipc.requestToPackage(
                'asset-db',
                'query-asset-meta',
                uuid
            );

            vm.asset.info = info;
            vm.asset.meta = meta;

            vm.type = 'asset';
        } else if (type === 'node') {
            const node = await Editor.Ipc.requestToPackage(
                'scene',
                'query-node',
                uuid
            );

            vm.node = node;

            vm.type = 'node';
        } else {
            vm.type = '';
        }

        vm.loading = false;
    },
    /**
     * 比对节点根据diff结果修改
     * @param {string} uuid
     */
    async 'scene:node-changed'(uuid: string) {
        const {
            uuid: { value: currentUuid }
        } = vm.type === 'node' ? vm.node : vm.asset.info;
        if (uuid === currentUuid) {
            const node = await Editor.Ipc.requestToPackage(
                'scene',
                'query-node',
                uuid
            );
            const delta = diffpatcher.diff(vm.node, node);
            if (delta) {
                diffpatcher.patch(vm.node, delta);
            }
        }
    }
};

export async function ready() {
    // @ts-ignore
    panel = this;

    // 初始化 vue
    vm = new Vue({
        el: panel.$.content,
        data: {
            loading: false,
            type: '',
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
        methods: <any>{
            /**
             * 发送属性修改请求
             * @param {SetPropertyOptions} option
             * @returns
             */
            async setProperty(option: SetPropertyOptions) {
                try {
                    await Editor.Ipc.sendToPanel(
                        'scene',
                        'set-property',
                        option
                    );
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
                const option: SetPropertyOptions | null = this.getPropertyOption(
                    event,
                    prefix
                );
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
            getPropertyOption(
                event: any,
                prefix: string | undefined
            ): SetPropertyOptions | null {
                const node: NodeDump = this.node;
                const { value } = event.target;
                const { value: uuid } = node.uuid;
                const path = event.target.getAttribute('path') || '';
                const keys = prefix
                    ? `${prefix}.${path}`.split('.')
                    : path.split('.');
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
                        (item: number, index: number) =>
                            index === 3
                                ? item
                                : Math.round((item * 10) / 255) / 10
                    );
                }

                return {
                    uuid,
                    path: keys.join('.'),
                    key,
                    dump
                };
            }
        }
    });
}

export async function beforeClose() {}

export async function close() {}
