'use strict';

declare const cc: any;

export function getDefault(attribute: any) {
    let result;
    if (typeof attribute.default === 'function') {
        result = attribute.default();
    } else {
        result = attribute.default;
    }
    if (attribute.saveUrlAsAsset && attribute.default === '') {
        result = null;
    }
    return result;
}

export function getConstructor(object: any, attribute: any) {
    if (attribute.ctor) {
        return attribute.ctor;
    }

    if (
        object === null ||
        object === undefined
    ) {
        return null;
    }

    return object.constructor;
}

export function getType(ctor: any) {
    if (!ctor) {
        return 'Unknown';
    }
    return cc.js._getClassId(ctor) || ctor.name;
}

/**
 * 获取一个类的名字
 * @param ctor
 */
export function getTypeName(ctor: any) {
    const name = cc.js.getClassName(ctor);

    // if (name.startsWith('cc.')) {
    //     name = name.slice(3);
    // }
    return name || 'Unknown';
}

/**
 * 获取一个类的继承链数组
 * @param ctor
 */
export function getTypeInheritanceChain(ctor: any) {
    return cc.Class.getInheritanceChain(ctor)
        .map((itemCtor: any) => {
            return getTypeName(itemCtor);
        })
        .filter(Boolean);
}

export function parsingPath(path: string) {
    path = path.replace(/^__comps__/, '_components');

    // path 如果是是 position.x || position.y 实际修改的应该是 node._lpos.x || node._lpos.y
    path = path.replace(/^position$/, '_lpos');
    // 如果修改的是 scale.x || scale.y 实际修改的应该是 node._scale.x || node._scale.y
    path = path.replace(/^scale$/, '_lscale');
    // 如果修改的是 rotation.x || rotation.y 实际修改的应该是 node.eulerAngle.x || node.eulerAngle.y
    path = path.replace(/^rotation$/, 'eulerAngles');

    const keys = (path || '').split('.');
    const key = keys.pop() || '';

    return {
        search: keys.join('.'),
        key,
    };
}

/**
 * 填充一个数组的数据
 * @param attrs 定义的 attrs
 * @param array 数组对象
 * @param start 开始索引
 * @param end 结束索引
 */
export function fillDefaultValue(attrs: any, array: any[], start: number, end: number) {
    const DefaultMap: any = {
        Boolean: false,
        String: '',
        Float: 0,
        Integer: 0,
    };

    let val = attrs.saveUrlAsAsset ? '' : DefaultMap[attrs.type];

    if (val !== undefined) {
        for (let i = start; i < end; i++) {
            array[i] = val;
        }

        return;
    }

    switch (attrs.type) {
        case 'Enum': {
            const list = attrs.enumList;
            val = (list[0] && list[0].value) || 0;
            for (let i = start; i < end; i++) {
                array[i] = val;
            }
            break;
        }
        case 'Object': {
            const { ctor: Ctor } = attrs;

            if (
                cc.js.isChildClassOf(Ctor, cc.Asset) ||
                cc.js.isChildClassOf(Ctor, cc.Node) ||
                cc.js.isChildClassOf(Ctor, cc.Component)
            ) {
                for (let i = start; i < end; i++) {
                    array[i] = null;
                }
                break;
            } else {
                for (let i = start; i < end; i++) {
                    try {
                        array[i] = new Ctor();
                    } catch (err) {
                        console.error(err);
                        array[i] = null;
                    }
                }

                break;
            }
        }
        default:
            console.warn('无法填充数组数据：没有定义数组类型');
    }
}
