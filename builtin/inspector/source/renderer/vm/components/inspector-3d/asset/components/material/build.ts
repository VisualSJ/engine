'use strict';

interface IPropItem {
    name: string;
    dump: any;
    type: string;
    childMap: {[index: string]: IPropItem};
}

/**
 * 传入一个 technique 下的某个 pass 数据，整理成树形结构
 * @param props
 * @param defs
 */
export function buildEffect(props: any[], defs: any[], defineValues: any, propValues: any) {

    defineValues = defineValues || {};
    propValues = propValues || {};

    const tree: IPropItem = {
        name: 'root',
        dump: null,
        type: 'ui.Depend',
        childMap: {},
    };

    function encode(item: any) {
        let current = tree;
        if (item.defines && item.defines.length) {
            item.defines.forEach((name: any) => {
                let child: IPropItem = current.childMap[name];
                if (!child) {
                    child = current.childMap[name] = {
                        name,
                        dump: null,
                        type: 'ui.Depend',
                        childMap: {},
                    };
                }
                current = child;
            });
        }

        if (current.childMap[item.name]) {
            const child = current.childMap[item.name];
            child.name = item.name;
            child.type = item.type;
            child.dump = item.dump;
        } else {
            current.childMap[item.name] = {
                name: item.name,
                dump: item.dump,
                type: item.type,
                childMap: {},
            };
        }
        current.childMap[item.name].dump.name = item.name;

        if (defineValues[item.name]) {
            current.childMap[item.name].dump.value = defineValues[item.name];
            if (typeof defineValues[item.name] === 'object' && '__uuid__' in defineValues[item.name]) {
                defineValues[item.name].uuid = defineValues[item.name].__uuid__;
                delete defineValues[item.name].__uuid__;
            }
        } else if (propValues[item.name]) {
            current.childMap[item.name].dump.value = propValues[item.name];
            if (typeof propValues[item.name] === 'object' && '__uuid__' in propValues[item.name]) {
                propValues[item.name].uuid = propValues[item.name].__uuid__;
                delete propValues[item.name].__uuid__;
            }
        }
    }

    defs.forEach((item) => {
        item.dump.type = 'ui.Depend';
        encode(item);
    });
    props.forEach(encode);

    function translate(item: IPropItem) {
        const children = Object.keys(item.childMap).map((name) => {
            const child = item.childMap[name];
            translate(child);
            return child;
        });
        if (item.dump) {
            item.dump.children = children;
        }
        return item;
    }

    return translate(tree);
}

export async function encodeMTL(name: string, techIdx: number, passes: any) {

    const effect = await Editor.Ipc.requestToPackage('scene', 'query-effect-data-for-inspector', name);

    const data = effect[techIdx];

    const mtl: any = {
        name,
        technique: techIdx,
        data,
    };

    function step(item: IPropItem, index: number) {

        if (item.dump) {
            const dump = JSON.parse(JSON.stringify(item.dump));
            delete dump.children;

            let current = data[index].defines.find((child: any) => item.name === child.name);
            if (!current) {
                current = data[index].props.find((child: any) => item.name === child.name);
            }

            current.dump.value = dump.value;
        }

        Object.keys(item.childMap).forEach((name) => {
            const child = item.childMap[name];
            step(child, index);
        });
    }

    passes.forEach((pass: IPropItem, index: number) => {
        step(pass, index);
    });

    return mtl;
}
