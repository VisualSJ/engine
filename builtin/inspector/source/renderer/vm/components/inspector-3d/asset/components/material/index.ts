'use strict';

import { readJSONSync } from 'fs-extra';

import { buildEffect, encodeMTL } from './build';

export const template = `
<section class="asset-material">
    <div class="header">
        <ui-prop label="Effect">
            <ui-select slot="content"
                :value="effect"
                @confirm="effect = $event.target.value"
            >
                <option
                    v-for="type in effects"
                    :value="type"
                >{{type}}</option>
            </ui-select>
        </ui-prop>
        <ui-prop label="Technique">
            <ui-select slot="content"
                :value="technique"
                @confirm="technique = $event.target.value"
            >
                <option
                    v-for="(item,index) in techniques"
                    :value="index"
                >{{index}}</option>
            </ui-select>
        </ui-prop>
    </div>

    <div class="content">
        <template
            v-for="(passes,index) in techniques"
        >
            <template
                v-if="index == technique"
            >
                <div class="pass"
                    v-for="(pass,index) in passes"
                >
                    <span>Pass {{index}}</span>
                    <div>
                        <template
                            v-for="item in pass.childMap"
                        >
                            <asset-prop auto="true"
                                :value="item.dump"
                            ></asset-prop>
                        </template>
                    </div>
                </div>
            </template>
        </template>
    </div>
</section>
`;

export const props = [
    'info',
    'meta',
];

export const components = {
    'asset-prop': require('../../../../public/ui-prop'),
};

export const methods = {

    /**
     * 读取 mtl 源文件数据
     */
    async loadMaterial() {
        // @ts-ignore
        const vm: any = this;

        if (!vm.meta) {
            return;
        }

        vm.material = readJSONSync(vm.info.file);
    },

    /**
     * 读取所有注册在案的 effect 数据
     */
    async loadAllEffect() {
        // @ts-ignore
        const vm: any = this;

        if (!vm.meta) {
            return;
        }

        const effects: any[] = await Editor.Ipc.requestToPackage('scene', 'query-all-effects');
        vm.effects = Object.keys(effects); // .filter((key) => !key.startsWith('_'));

        // 数据读取后，更新当前选中的是哪一个 effect
        const uuid = vm.material && vm.material._effectAsset ? vm.material._effectAsset.__uuid__ : '';
        // @ts-ignore
        const effect = Object.values(effects).find((item) => {
            return item.uuid === uuid;
        });
        vm.effect = effect._name;
    },

    async reset() {},

    async apply() {
        // @ts-ignore
        const vm: any = this;
        const mtl = await encodeMTL(vm.effect, vm.technique, vm.techniques[vm.technique]);
        const result = await Editor.Ipc.requestToPackage('scene', 'query-serialized-material', mtl);
        await Editor.Ipc.requestToPackage('asset-db', 'save-asset', vm.info.uuid, result);

        return false;
    },
};

export const watch = {
    /**
     * 更改 effect 时，需要更新显示列表
     */
    async effect(name: string) {
        // @ts-ignore
        const vm: any = this;
        if (!name) {
            vm.props = [];
            return;
        }
        const array = await Editor.Ipc.requestToPackage('scene', 'query-effect-data-for-inspector', name);
        vm.techniques = array.map((technique: any[], index: number) => {
            return technique.map((data: any, index: number) => {
                // 合并 data.defines 和 data.props
                const tree = buildEffect(
                    data.props,
                    data.defines,
                    vm.material._defines[index],
                    vm.material._props[index]
                );
                return tree;
            });
        });

        if (vm.technique > vm.techniques.length) {
            vm.technique = 0;
        }
    },

    /**
     * meta 更新的时候需要刷新当前的资源数据
     */
    async meta() {
        // @ts-ignore
        const vm: any = this;

        vm.effect = '';
        vm.technique = 0;
        vm.techniques = [];
        requestAnimationFrame(async () => {
            await vm.loadMaterial();
            await vm.loadAllEffect();
        });
    },
};

export function data() {
    return {
        material: null, // 当前修改的 material 资源数据（源文件）
        effects: [], // 查询出来记录在案的所有 effect 列表

        effect: '', // 当前选中的 effect 名字
        technique: 0, // 当前选中的 technique 索引

        techniques: [], // 用于显示的树形数据
    };
}

export async function mounted() {
    // @ts-ignore
    const vm: any = this;

    await vm.loadMaterial();
    await vm.loadAllEffect();
}
