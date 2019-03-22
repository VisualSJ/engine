'use strict';

import { readTemplate } from '../../../utils';

const importers: string[] = [
    'effect',
    'fbx',
    'gltf',
    'image',
    'javascript',
    'typescript',
    'texture',
    'texture-cube',
    'sprite-frame',
    'material',
    'gltf-material',
];

export const template = readTemplate('inspector-3d/asset/index.html');

export const props = [
    'uuid',
    'language',
    'width',
];

export const components = {
    'asset-header': require('./public/header'),

    'asset-directory': require('./components/directory'),
    'asset-effect': require('./components/effect'),
    'asset-fbx': require('./components/fbx'),
    'asset-gltf': require('./components/gltf'),
    'asset-image': require('./components/image'),
    'asset-javascript': require('./components/javascript'),
    'asset-typescript': require('./components/typescript'),
    'asset-texture': require('./components/texture'),
    'asset-texture-cube': require('./components/texture-cube'),
    'asset-sprite-frame': require('./components/sprite-frame'),
    'asset-material': require('./components/material/index'),
    'asset-gltf-material': require('./components/material/index'),
};

export const methods = {
    /**
     * 中断正在执行的操作
     * 一般是选中器其他物体
     */
    break(uuid: string) {
        // @ts-ignore
        const vm: any = this;
        uuid = uuid || vm.uuid;

        if (!vm.dirty) {
            return;
        }
        const result = Editor.Dialog.show({
            title: 'warn',
            type: 'warn',
            message: Editor.I18n.t(`inspector.check_is_saved.message`),
            buttons: [
                Editor.I18n.t('inspector.check_is_saved.abort'),
                Editor.I18n.t('inspector.check_is_saved.save'),
            ],
        });
        
        if (result === 1) {
            vm._onApply(uuid);
        }
    },

    /**
     * 获取当前资源需要使用哪种组件渲染
     */
    getComponentName(info: any) {
        if (!info) {
            return '';
        }
        if (info.isDirectory) {
            return 'asset-directory';
        }

        if (importers.includes(info.importer)) {
            return 'asset-' + info.importer;
        }
    },

    /**
     * 刷新 asset 面板数据
     */
    async refresh() {
        // @ts-ignore
        const vm: any = this;

        vm.info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', vm.uuid);
        vm.meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', vm.uuid);

        vm.componentName = vm.getComponentName(vm.info);

        vm.$watch('meta', () => {
            vm.dirty = true;
        }, {
            deep: true,
        });

        vm.dirty = false;
        requestAnimationFrame(() => {
            vm.dirty = false;
        });
    },

    /**
     * 从面板上传来的 confirm 事件
     */
    _onConfirm() {
        // @ts-ignore
        const vm: any = this;
        vm.dirty = true;

        vm.$refs.component.change && vm.$refs.component.change();
    },

    /**
     * 按下了 reset 按钮
     */
    async _onReset() {
        // @ts-ignore
        const vm: any = this;

        if (vm.$refs.component.reset) {
            const result = await vm.$refs.component.reset();
            if (result === false) {
                vm.dirty = false;
                return;
            }
        }

        vm.refresh();
    },

    /**
     * 按下了 apply 按钮
     */
    async _onApply(uuid: string) {
        // @ts-ignore
        const vm: any = this;
        if (typeof uuid !== 'string') {
            uuid = vm.uuid;
        }

        if (vm.$refs.component && vm.$refs.component.apply) {
            const result = await vm.$refs.component.apply();
            if (result === false) {
                vm.dirty = false;
                return;
            }
        }

        const meta = JSON.stringify(vm.meta);
        await Editor.Ipc.requestToPackage('asset-db', 'save-asset-meta', uuid, meta);

        vm.dirty = false;
        requestAnimationFrame(() => {
            vm.dirty = false;
        });
    },
};

export const watch = {
    uuid(nData: string, oData: string) {
        // @ts-ignore
        this.break(oData);
        // @ts-ignore
        this.refresh();
    },
};

export function data() {
    return {
        dirty: false,
        info: null,
        meta: null,
        componentName: null,
    };
}

export async function mounted() {
    // @ts-ignore
    this.refresh();
}
