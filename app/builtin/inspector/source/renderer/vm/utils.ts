'use stirct';

import { readFileSync } from 'fs-extra';
import { join } from 'path';
const _ = require('lodash');

function translate(dump: any, path: string) {
    const type = typeof dump;
    if (!dump || type !== 'object') {
        return;
    }
    if (Array.isArray(dump)) {
        dump.forEach((item, index) => {
            item.name = `[${index}]`;
            item.path = `${path}.${index}`;
            translate(item.value, item.path);
        });
    }
    for (const name of Object.keys(dump)) {
        const item = dump[name];
        if (item && typeof item === 'object') {
            item.name = name;
            item.path = `${path}.${name}`;
            translate(item.value, item.path);
        }
    }
}

export function translationDump(dump: any) {

    dump.active.name = 'Active';
    dump.name.name = 'Name';
    dump.position.name = 'Position';
    dump.rotation.name = 'Rotation';
    dump.scale.name = 'Scale';

    dump.active.path = 'active';
    dump.name.path = 'name';
    dump.position.path = 'position';
    dump.rotation.path = 'rotation';
    dump.scale.path = 'scale';

    dump.__comps__.forEach((component: any, index: number) => {
        component.name = component.type;
        component.path = `__comps__.${index}`;
        translate(component.value, component.path);
    });

    return dump;
}

export function transSceneDump(dump: any) {
    dump.active.name = 'Active';
    dump.name.name = 'Name';
    for (const name of Object.keys(dump._globals)) {
        const item = dump._globals[name];
        item.name = name;
        translate(item.value, `_globals.${name}`);
    }
    return dump;
}

export function readTemplate(path: string) {
    path = join(__dirname, `../../../static/template/components/`, path);
    return readFileSync(path, 'utf8');
}

export function mergeDumps(dumps: any[]) {
    if (!dumps) {
        return null;
    }
    const temp = dumps[0];

    const result: any = {
        uuid: dumps.map((dump) => {
            return dump.uuid.value;
        }),
        __type__: temp.__type__,
        __comps__: [],
    };

    // 提取相同的 value
    const ignore = ['__type__', 'uuid', 'parent', '__comps__', 'children', '__prefab__'];
    Object.keys(temp).forEach((key) => {
        if (ignore.indexOf(key) !== -1) { return; }

        // 检查这个属性是否在每个对象内都有
        const values: any = [];
        const allow = dumps.every((dump) => {
            const value = dump[key];
            values.push(value);
            return !!value;
        });
        if (!allow) { return; }
        // 将 value 队列合并，按照格式整理一遍
        result[key] = merge(values);
    });

    // 提取相同的 component
    temp.__comps__.forEach((sourceComp: any) => {
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

        result.__comps__.push(mergeComponent(comps));
    });
    return result;
}

// 合并数据值
function merge(values: any[]) {
    const temp = values[0];

    const result: any = temp;
    const ignore = ['default', 'extends'];

    // 将 value 内的其他值合并到 result 内
    Object.keys(temp).forEach((key) => {
        if (ignore.indexOf(key) !== -1) {
            result[key] = temp[key];
            return;
        }
        if (typeof temp[key] === 'object') {
            const data = values.map((value) => {
                return value[key];
            });
            result[key] = merge(data);
            return;
        }
        const allow = values.every((item) => {
            return temp[key] === item[key];
        });
        if (!allow && (key === 'value' || !temp.type)) {
            result[key] = '-';
        }
        if (allow) {
            result[key] = temp[key];
        }
    });
    return result;
}

/**
 * 传入 target 队列和 comp 的 type
 * 将队列内的 type component 合并成一个 component 返回
 * @param {Array} comps
 * @param {String} type
 */
function mergeComponent(comps: any[]) {
    const tempCom = comps[0];

    const result: any = tempCom;
    // 提取相同的 value
    Object.keys(tempCom.value).forEach((key) => {
        if (!tempCom.value[key].visible) {
            return;
        }
        const values = comps.map((compItem: any) => {
            return JSON.parse(JSON.stringify(compItem.value[key]));
        });
        // 将 value 队列合并，按照格式整理一遍
        result.value[key] = merge(values);
    });
    return result;
}
