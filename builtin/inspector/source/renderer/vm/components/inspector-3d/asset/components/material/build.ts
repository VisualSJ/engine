'use strict';

/**
 * 传入一个 technique 下的某个 pass 数据，整理成树形结构
 * @param props
 * @param defs
 */
export function buildEffect(props: any[], defs: any[]) {
    const tree: any = {};
    const curDefs: any = {};

    // sort props by define dependencies
    for (const prop of props) {
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
        if (curDefs[def.key] || def.key.startsWith('CC_')) {
            continue;
        }
        def.defines.concat(def.key).reduce((node: any, d: any) => node[d] || (node[d] = {}), tree);
    }

    return tree;
}

/**
 * 将 buildEffect 出来的数据，整理成显示使用的数据
 * @param tree
 * @param material
 */
export function translateEffect(tree: any, material: any) {
    const array: any[] = [];
    tree.props && tree.props.forEach((item: any) => {
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
            type: item.compType || '',
            assetType: item.type,
            default: item.value,
            value,
        });
    });
    Object.keys(tree).forEach((name) => {
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
            children: translateEffect(tree[name], material),
        });
    });
    return array;
}

export async function encodeMTL(name: string, techIdx: number, passes: any) {

    const data = await Editor.Ipc.requestToPackage('scene', 'query-effect-data-for-inspector', name);

    const mtl: any = {
        effectName: name,
        effectMap: data,
        _techIdx: techIdx,
        _props: [],
        _defines: [],
    };

    function step(array: any[], index: number) {
        array.forEach((item: any) => {
            if (item.children) {
                if (JSON.stringify(item.default) !== JSON.stringify(item.value)) {
                    const define = mtl.effectMap[techIdx][index].defines.find((child: any) => {
                        return child.key === item.name;
                    });
                    define.value = item.value;
                    mtl._defines[index][item.name] = item.value;
                }
                step(item.children, index);
            } else {
                if (JSON.stringify(item.default) !== JSON.stringify(item.value)) {
                    const prop = mtl.effectMap[techIdx][index].props.find((child: any) => {
                        return child.key === item.name;
                    });
                    prop.value = item.value;
                    mtl._props[index][item.name] = item.value;
                }
            }
        });
    }

    passes.forEach((pass: any, index: number) => {
        mtl._props[index] = {};
        mtl._defines[index] = {};
        step(pass, index);
    });

    return mtl;
}
