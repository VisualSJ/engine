'use strict';

/**
 * 合并多个节点 dump 数据
 * @param dumps 
 */
export function mergeDumps(dumps: Array<IScene | INode>) {
    // 获取参照 dump
    const target = dumps[0];

    if (!target) {
        return null;
    }

    // 过滤不同类型的数据
    dumps = dumps.filter((dump) => {
        return dump.__type__ === target.__type__;
    });

    switch(target.__type__) {
        case 'cc.Node':
            // @ts-ignore
            return mergeNode(dumps);
        case 'cc.Scene':
          // @ts-ignore
            return mergeScene(dumps);
        default:
            console.warn(`The property inspector could not merge dump data`);
            return null;
    }
}

export function mergeNode(dumps: Array<INode>) : INode {

    const activeDumps = dumps.map((dump) => {
        return dump.active;
    });
    const nameDumps = dumps.map((dump) => {
        return dump.name;
    });
    const positionDumps = dumps.map((dump) => {
        return dump.position;
    });
    const rotationDumps = dumps.map((dump) => {
        return dump.rotation;
    });
    const scaleDumps = dumps.map((dump) => {
        return dump.scale;
    });
    const uuidDumps = dumps.map((dump) => {
        return dump.uuid;
    });

    const target = dumps[0];
    const components: any[] = [];

    // dump.__comps__.forEach((comp) => {
    // });

    // 提取相同的 component
    target.__comps__.forEach((sourceComp: any) => {
        const comps: any[] = [];

        // 判断其他几个 dump 内是否有相同的组件
        dumps.forEach((dump) => {
            const comp = dump.__comps__.find((item: any) => {
                return item.type === sourceComp.type;
            });
            if (comp) {
                comps.push(comp);
            }
        });

        // 如果长度相等，说明所有 dump 都有这个组件
        if (comps.length !== dumps.length) {
            return;
        }

        components.push(mergeComponent(comps));
    });

    return {
        active: mergeProperty(activeDumps),
        name: mergeProperty(nameDumps),
        position: mergeProperty(positionDumps),
        rotation: mergeProperty(rotationDumps),
        scale: mergeProperty(scaleDumps),
        uuid: mergeProperty(uuidDumps),

        children: [], // inspector 不需要 children 数据
        parent: '', // inspector 不需要 parent 数据
        __comps__: components,
        __prefab__: dumps.every(dump => !!dump.__prefab__) ? dumps[0].__prefab__ : undefined,
        __type__: 'cc.Node',
    };
}

export function mergeScene(dumps: Array<IScene>) : IScene {

    const nameDumps = dumps.map((dump) => {
        return dump.name;
    });
    const activeDumps = dumps.map((dump) => {
        return dump.active;
    });
    const _globalsDumps = dumps.map((dump) => {
        return dump._globals;
    });
    const uuidDumps = dumps.map((dump) => {
        return dump.uuid;
    });

    return {
        name: mergeProperty(nameDumps),
        active: mergeProperty(activeDumps),
        _globals: mergeProperty(_globalsDumps),
        isScene: true,

        uuid: mergeProperty(uuidDumps),
        children: [], // inspector 不需要 children 数据
        parent: '', // inspector 不需要 parent 数据
        __type__: 'cc.Node',
    };
}

export function mergeComponent(comps: Array<IProperty>) {
    const target = comps[0];


    const dump: IProperty = {
        value: undefined,
        default: null,
        extends: [],
        editor: {},

        type: '',
        readonly: false,
        visible: false,
    };

    if (!target) {
        return dump;
    }

    if (comps.length > 1) {
        const value = {};
        Object.keys(target.value || {}).map((key) => {
            // @ts-ignore
            const dumps: IProperty[] = comps.map((item) => {
                // @ts-ignore
                return item.value[key];
            });

            // @ts-ignore
            value[key] = mergeProperty(dumps);
        });
    
        dump.value = value;
    } else {
        dump.value = target.value;
    }
    dump.default = target.default;
    dump.extends = target.extends;
    dump.editor = target.editor;
    dump.type = target.type;
    dump.readonly = target.readonly;
    dump.visible = target.visible;

    return dump;
}

export function mergeProperty(dumps: Array<IProperty | undefined>) : IProperty {
    const target = dumps[0];

    const dump: IProperty = {
        value: undefined,
        default: null,

        type: '',
        readonly: false,
        visible: false,
    };

    if (!target) {
        return dump;
    }

    [
        'default', 'type', 'readonly', 'visible',
        'path', 'isArray', 'invalid', 'extends', 'displayName', 'displayOrder',
        'tooltip', 'editor', 'animatable', 'enumList',
        'min', 'max', 'step', 'slide', 'unit', 'multiline',
    ].forEach((key: string) => {
        if (key in target) {
            // @ts-ignore
            dump[key] = target[key];
        }
    });

    // if (
    //     target.type === 'cc.Asset' || (target.extends && target.extends.includes('cc.Asset'))
    // ) {
        
    // } else 
    if (typeof target.value !== 'object') {
        if (dumps.every((item) => {
            // @ts-ignore
            return item.value === target.value;
        })) {
            dump.value = target.value;
        }
    } else if (Array.isArray(target.value)) {
        dump.value = undefined;
    } else {
        dump.value = {};
        // @ts-ignore
        Object.keys(target.value).forEach((key) => {
            if (dumps.every((item) => {
                // @ts-ignore
                return item.value[key] === target.value[key];
            })) {
                // @ts-ignore
                dump.value[key] = target.value[key];
            }
        });
    }

    return dump;
}
