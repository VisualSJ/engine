'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

import { init } from './vm';

import { changeCurveData, changeCurveState } from '../curve-editor/manager';
import { changeGradintState, changeGrandintData, } from '../gradient-editor/manager';
import { changeSpriteData, changeSpriteState, } from '../sprite-editor/manager';

let panel: any = null;
let vm: any = null;
let _waitDeleteUuids: string[] = [];

export const style = readFileSync(join(__dirname, '../../dist/index.css'));

export const template = readFileSync(join(__dirname, '../../static', '/template/index.html'));

/**
 * 配置 inspector 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'inspector',
        file: 'packages://inspector/static/style/imports/iconfont.woff',
    },
];

export const $ = {
    content: '.content',
};

export const messages = {
    /**
     * 场景已准备
     */
    'scene:ready'() {
        if (!vm) {
            return;
        }
        vm.state.scene = 'ready';
        vm.$refs.node && vm.$refs.node.refresh();
    },

    /**
     * 场景已关闭
     */
    'scene:close'() {
        if (!vm) {
            return;
        }

        // 避免 scene 刷新时 inspector 还是旧数据
        if (vm.item.node === 'node') {
            vm.item.uuid = '';
        }

        vm.state.scene = 'close';
    },

    /**
     * asset-db 已准备
     */
    'asset-db:ready'() {
        if (!vm) {
            return;
        }
        vm.state.db = 'ready';
    },

    /**
     * asset-db 已关闭
     */
    'asset-db:close'() {
        if (!vm) {
            return;
        }
        vm.state.db = 'close';
    },

    /**
     * 选中某个物体
     * @param type 选中物体的类型
     * @param uuid 选中物体的 uuid
     */
    'selection:select'(type: string, uuid: string) {
        if (!vm) {
            return;
        }
        // @ts-ignore
        clearTimeout(this._unselectTimer);
        const uuids = Editor.Selection.getSelected(type);

        // 更新选中的物体类型
        vm.item.type = type;
        // 更新选中的 uuid 列表
        vm.item.uuids = Array.from(uuids);
    },

    /**
     * 取消选中某个物体
     * @param type
     * @param uuid
     */
    'selection:unselect'(type: string, uuid: string) {
        if (!vm) {
            return;
        }

        if (vm.item.type !== type) {
            return;
        }

        // 延迟判断是否需要清空，如果只是 unselect，立马 select 了其他数据，则不需要清空
        // @ts-ignore
        clearTimeout(this._unselectTimer);
        _waitDeleteUuids.push(uuid);

        // @ts-ignore
        this._unselectTimer = setTimeout(() => {
            while (_waitDeleteUuids.length) {
                const uuid = _waitDeleteUuids.pop();

                const index = vm.item.uuids.indexOf(uuid);
                if (index !== -1) {
                    vm.item.uuids.splice(index, 1);
                }

                if (vm.item.uuids.length === 0) {
                    vm.item.type = '';
                    vm.item.uuids = [];
                }
            }
        }, 200);
    },

    /**
     * 如果时间变化的时候，需要更新显示数据
     */
    async 'scene:animation-time-change'() {
        vm.$refs.node && vm.$refs.node.refresh();
    },

    /**
     * 比对节点根据diff结果修改
     * @param {string} uuid
     */
    async 'scene:change-node'(uuid: string) {
        vm.$refs.node && vm.$refs.node.refresh();
    },

    /**
     * asset 资源更新刷新显示内容
     * @param uuid
     */
    async 'asset-db:asset-change'(uuid: string) {
        vm.$refs.asset && vm.$refs.asset.refresh();
    },

    /**
     * effect 更新广播
     * @param uuid
     */
    async 'scene:effect-update'(uuid: string) {

    },

    'gradient:state'(bool: boolean) {
        changeGradintState(bool);
    },

    'gradient:change'(dump: any) {
        changeGrandintData(dump);
    },

    'curve:state'(bool: boolean) {
        changeCurveState(bool);
    },

    'curve:change'(dump: any) {
        changeCurveData(dump);
    },

    'sprite:state'(bool: boolean) {
        changeSpriteState(bool);
    },

    'sprite:change'(dump: any) {
        changeSpriteData(dump);
    },
};

export const listeners = {
    resize() {
        vm && vm.resize();
    },
};

export async function ready() {
    // @ts-ignore
    panel = this;

    vm = init(panel.$.content);

    const type = Editor.Selection.getLastSelectedType();
    const uuids = Editor.Selection.getSelected(type);

    vm.item.type = type;
    vm.item.uuids = uuids;

    if (await Editor.Ipc.requestToPackage('asset-db', 'query-ready')) {
        vm.state.db = 'ready';
    }
    if (await Editor.Ipc.requestToPackage('scene', 'query-is-ready')) {
        vm.state.scene = 'ready';
    }

    // 订阅 i18n 变动
    panel.switchLanguage = (language: string) => {
        vm.language = language;
    };
    Editor.I18n.on('switch', panel.switchLanguage);
}

export async function beforeClose() { }

export async function close() {
    Editor.I18n.removeListener('switch', panel.switchLanguage);
}
