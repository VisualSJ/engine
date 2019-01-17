'use stirct';

import { readFileSync } from 'fs-extra';
import { join } from 'path';

const knownTypes = [
    'number',
    'blloean',
    'string',
    'Enum',
    'cc.Size',
    'cc.Vec2',
    'cc.Vec3',
    'cc.Color',
    'cc.Rect',
    'cc.Node',
    'cc.Asset',
];

function checkType(data: any) {
    if (!data || !data.value) {
        return true;
    }
    if (data.isArray) {
        return true;
    }
    return knownTypes.includes(data.type);
}

function isNode(dump: any) {
    if (!dump) {
        return false;
    }
    if (!dump.extends) {
        return false;
    }
    return dump.extends.indexOf('cc.Node') !== -1;
}

function isAsset(dump: any) {
    if (!dump) {
        return false;
    }
    if (!dump.extends) {
        return false;
    }
    return dump.extends.indexOf('cc.Asset') !== -1;
}

export function translationDump(dump: any) {

    // {
    //     name: 'Position',
    //     type: 'vec2',
    //     path: 'position',
    //     value: { x: 0, y: 0, z: 0 },
    // }

    function translate(key: string, path: string, dump: any) {
        return {
            name: key,
            type: dump.type || dump.value,
            path,
            value: dump.value,
        };
    }

    const data: any = {};

    data.active = translate('Active', 'active', dump.active);
    data.name = translate('Name', 'name', dump.name);
    data.position = translate('Position', 'position', dump.position);
    data.rotation = translate('Rotation', 'rotation', dump.rotation);
    data.scale = translate('Scale', 'scale', dump.scale);

    function translateObject(key: string, dump: any, path: string) {
        const data: any = translate(key, path, dump);

        if (data.type === 'Array' || Array.isArray(dump.value)) {
            data.isArray = true;
            if (dump.properties) {
                data.type = dump.properties.type;
            }

            const array = data.value;
            data.value = array.map((ccclass: any, index: string) => {
                return translateCCClass(index, ccclass.properties, ccclass, `${path}.${key}`);
            });
        }

        if (isNode(dump.value)) {
            data.nodeType = data.type;
            data.type = 'cc.Node';
        }

        if (isAsset(dump.value)) {
            data.assetType = data.type;
            data.type = 'cc.Asset';
        }

        if (data.type === 'Enum') {
            data.enumList = dump.properties.enumList;
        }

        // 检查是否是未知类型，如果是的话，需要递归处理内部的所有属性
        if (!checkType(data)) {
            Object.keys(data.value).forEach((key: string) => {
                const dump = data.value[key];
                data.value[key] = translateObject(key, dump, `${path}.${key}`);
            });
        }

        return data;
    }

    function translateCCClass(key: string, properties: any, value: any, path: string) {
        const data: any = translate(properties ? properties.displayName || key : key, `${path}.${key}`, value);

        if (data.type === 'Array') {
            data.isArray = true;
            data.type = properties.type;

            const array = data.value;
            data.value = array.map((ccclass: any, index: string) => {
                return translateCCClass(index, ccclass.properties, ccclass, `${path}.${key}`);
            });
        }

        if (isNode(value)) {
            data.nodeType = data.type;
            data.type = 'cc.Node';
        }

        if (isAsset(value)) {
            data.assetType = data.type;
            data.type = 'cc.Asset';
        }

        if (data.type === 'Enum') {
            data.enumList = properties.enumList;
        }

        // 检查是否是未知类型，如果是的话，需要递归处理内部的所有属性
        if (!checkType(data)) {
            Object.keys(data.value).forEach((key: string) => {
                const dump = data.value[key];
                data.value[key] = translateObject(key, dump, `${data.path}.${key}`);
            });
        }

        return data;
    }

    function translateComponent(ccclass: any, path: string) {
        const data: any = {
            enabled: ccclass.value && ccclass.value.enabled && ccclass.value.enabled.value,
            name: ccclass.name,
            dump: {},
        };

        Object.keys(ccclass.value).forEach((key: string) => {
            const properties: any = ccclass.properties[key] || {};

            if (properties.visible === false) {
                return;
            }
            data.dump[key] = translateCCClass(key, properties, ccclass.value[key], path);
        });
        return data;
    }

    data.comps = dump.__comps__.map((component: any, index: number) => {
        return translateComponent(component, `__comps__.${index}`);
    });

    // debugger;

    return data;
}

export function readTemplate(path: string) {
    path = join(__dirname, `../../../static/template/components/`, path);
    return readFileSync(path, 'utf8');
}
