'use strict';

interface IPropItem {
    name: string;
    dump: any;
    type: string;
    childMap: {[index: string]: IPropItem};
    switch?: string;
}

/**
 * 传入一个 technique 下的某个 pass 数据，整理成树形结构
 * @param props
 * @param defs
 */
export function buildEffect(props: any[], defs: any[]) {

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
    }

    defs.forEach((item) => {
        switch(item.type) {
            case 'Number':
                item.dump.type = 'Enum';
                item.dump.enumList = [];
                for (let i = item.range[0]; i <= item.range[1]; i++) {
                    item.dump.enumList.push({
                        name: i,
                        value: i,
                    });
                }
                break;
            case 'String':
                item.dump.type = 'Enum';
                item.dump.enumList = item.options.map((str: string) => {
                    return {
                        name: str,
                        value: str,
                    }
                });
                break;
            default:
                item.dump.type = 'ui.Depend';
        }
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
