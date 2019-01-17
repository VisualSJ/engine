'use strict';

import { readJSONSync } from 'fs-extra';

const typeMap: any = {
    number: 'number',
    boolean: 'boolean',
    'cc-vec2': 'cc.Vec2',
    'cc-vec3': 'cc.Vec3',
    'cc-color': 'cc.Color',
    'cc-mat4': 'cc.Mat4',
    'cc-dragable': 'cc.Asset',
};

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
    </div>

    <div class="content">
        <template
            v-for="item in props"
        >
            <asset-prop
                :value="item"
            ></asset-prop>
        </template>
    </div>
</section>
`;

export const props = [
    'info',
    'meta',
];

export const components = {
    'asset-prop': require('../../../public/ui-prop'),
};

export const methods = {

    async reset() {
        await this.refresh();
    },

    async apply() {
        // @ts-ignore
        const vm: any = this;
        const data = await Editor.Ipc.requestToPackage('scene', 'query-effect-data-for-inspector', vm.effect);
        const options: any = {
            effectName: vm.effect,
            effectMap: data,
            _props: {},
            _defines: {},
        };

        function step(array: any[]) {
            array.forEach((item: any) => {
                if (item.children) {
                    if (JSON.stringify(item.default) !== JSON.stringify(item.value)) {
                        const define = options.effectMap.defines.find((child: any) => {
                            return child.key === item.name;
                        });
                        define.value = item.value;
                        options._defines[item.name] = item.value;
                    }
                    step(item.children);
                } else {
                    if (JSON.stringify(item.default) !== JSON.stringify(item.value)) {
                        const prop = options.effectMap.props.find((child: any) => {
                            return child.key === item.name;
                        });
                        prop.value = item.value;
                        options._props[item.name] = item.value;
                    }
                }
            });
        }
        step(vm.props);

        const result = await Editor.Ipc.requestToPackage('scene', 'query-serialized-material', options);
        await Editor.Ipc.requestToPackage('asset-db', 'save-asset', vm.info.uuid, result);

        return false;
    },

    async refresh() {
        // @ts-ignore
        const vm: any = this;

        vm.effect = '';

        const effects: any[] = await Editor.Ipc.requestToPackage('scene', 'query-all-effects');
        vm.effects = Object.keys(effects).filter((key) => !key.startsWith('_'));

        const path = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', vm.meta.uuid);
        vm.material = readJSONSync(path);

        const uuid = vm.material && vm.material._effectAsset ? vm.material._effectAsset.__uuid__ : '';

        // @ts-ignore
        const effect = Object.values(effects).find((item) => {
            return item.uuid === uuid;
        });
        vm.effect = effect._name;
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
        const path = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', vm.meta.uuid);
        const material = readJSONSync(path);
        const data = await Editor.Ipc.requestToPackage('scene', 'query-effect-data-for-inspector', name);

        // 合并 data.defines 和 data.props
        const tree = buildEffect(data.props, data.defines);

        function translate(node: any) {
            const array: any[] = [];
            node.props && node.props.forEach((item: any) => {
                let value = item.value;
                if (item.key in material._props) {
                    value = material._props[item.key];
                }

                if (value && value.__uuid__) {
                    value.uuid = value.__uuid__;
                }

                if (typeof value === 'object') {
                    value = JSON.parse(JSON.stringify(value));
                }

                array.push({
                    name: item.key,
                    type: typeMap[item.compType] || '',
                    assetType: item.type,
                    default: item.value,
                    value,
                });
            });
            Object.keys(node).forEach((name) => {
                if (name === 'props') {
                    return;
                }
                let value = false;
                if (name in material._defines) {
                    value = material._defines[name];
                }
                array.push({
                    name,
                    type: 'ui.Depend',
                    value,
                    default: false,
                    children: translate(node[name]),
                });
            });
            return array;
        }

        vm.props = translate(tree);
    },
};

export function data() {
    return {
        effects: [],
        props: [],

        material: null,

        effect: '',
    };
}

export async function mounted() {
    // @ts-ignore
    const vm: any = this;

    vm.refresh();
}

/**
 * 构建树形结构
 * @param props
 * @param defs
 */
function buildEffect(props: any[], defs: any[]) {
    const tree: any = {};
    const curDefs: any = {};

    // sort props by define dependencies
    for (const prop of props) {
        // let prop = props[name];
        let cur: any = tree;
        prop.defines.forEach((d: any) => {
            if (!cur[d]) {
                cur[d] = {};
            }
            cur = cur[d];
            curDefs[d] = true;
        });
        if (!cur.props) {
            cur.props = [];
        }
        cur.props.push(prop);
    }
    // add dangling defines
    for (const def of defs) {
        // let def = defs[name];
        if (curDefs[def.key] || def.key[0] === '_') {
            continue;
        }
        def.defines.concat(def.key).reduce((node: any, d: any) => node[d] || (node[d] = {}), tree);
    }

    return tree;
}
