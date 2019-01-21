'use strict';

declare const cc: any;
declare const Manager: any;

import {
    INode,
    IProperty,
} from './interface';

import {
    getConstructor,
    getDefault,
    getTypeInheritanceChain,
    getTypeName,
} from './utils';

/**
 * 编码一个 node 数据
 * @param node
 */
export function encodeNode(node: any): INode {
    const ctor = node.constructor;

    const emptyAttribute = {};

    const data: INode = {
        active: encodeObject(node.active, emptyAttribute),
        name: encodeObject(node.name, emptyAttribute),
        position: encodeObject(node._lpos, emptyAttribute),
        rotation: encodeObject(node.eulerAngles, emptyAttribute),
        scale: encodeObject(node._lscale, emptyAttribute),
        uuid: encodeObject(node.uuid, emptyAttribute),

        parent: encodeObject(node.parent, {
            ctor: cc.Node,
        }),

        children: node.children.map((child: any) => {
            return encodeObject(child, {
                ctor: cc.Node,
            });
        }),

        __type__: getTypeName(ctor),
        __comps__: node._components.map(encodeComponent),
    };
    return data;
}

/**
 * 编码一个 component
 * @param component
 */
export function encodeComponent(component: any): IProperty {
    const ctor = component.constructor;

    const data: IProperty = {
        value: {},
        type: getTypeName(ctor),
        readonly: false,
        visible: true,
    };

    ctor.__props__.map((key: string) => {
        if (!data.value) {
            return;
        }
        const attrs = cc.Class.attr(ctor, key);
        data.value[key] = encodeObject(component[key], attrs);
    });

    return data;
}

/**
 * 编码一个对象
 * @param object
 * @param options
 */
export function encodeObject(object: any, attributes: any): IProperty {
    const ctor = getConstructor(object, attributes);
    const defValue = getDefault(attributes);

    const data: IProperty = {
        value: null,
        type: getTypeName(ctor),
        readonly: !!attributes.readonly,
        visible: ('visible' in attributes) ? attributes.visible : true,
    };

    if (defValue) {
        if (Array.isArray(defValue)) {
            data.isArray = true;
        }
    }

    if (!data.isArray && Array.isArray(object)) {
        data.isArray = true;
    }

    if (!('default' in attributes) && !attributes.hasSetter) {
        data.readonly = true;
    }

    if (attributes.hasOwnProperty('enumList')) {
        data.enumList = attributes.enumList;
    }

    if (attributes.hasOwnProperty('displayName')) {
        data.displayName = attributes.displayName;
    }

    if (attributes.hasOwnProperty('multiline')) {
        data.multiline = attributes.multiline;
    }

    if (attributes.hasOwnProperty('min')) {
        data.min = attributes.min;
    }

    if (attributes.hasOwnProperty('max')) {
        data.max = attributes.max;
    }

    if (attributes.hasOwnProperty('step')) {
        data.step = attributes.step;
    }

    if (attributes.hasOwnProperty('slide')) {
        data.slide = attributes.slide;
    }

    if (attributes.hasOwnProperty('tooltip')) {
        data.tooltip = attributes.tooltip;
    }

    if (attributes.hasOwnProperty('animatable')) {
        data.animatable = attributes.animatable;
    }

    if (cc.js.isChildClassOf(ctor, cc.ValueType)) { // 如果是 valueType，则直接使用引擎序列化
        const dump = Manager.Utils.serialize(object, { stringify: false });
        delete dump.__type__;
        data.value = dump;
    } else if (data.isArray) {
        data.value = (object || []).map((item: any) => {
            // todo 需要确认数组类型的 attrs
            const childAttritube: any = {};
            if (attributes.ctor) {
                childAttritube.ctor = attributes.ctor;
            }
            const result = encodeObject(item, childAttritube);
            if (data.type && data.type !== 'Array' && data.type !== result.type) {
                data.type = 'Unknown';
            } else {
                data.type = result.type;
            }
            return result;
        });
    } else if (
        cc.js.isChildClassOf(ctor, cc.Node) ||
        cc.js.isChildClassOf(ctor, cc.Component)
    ) { // 如果是节点、资源、组件，则生成链接到对象的 uuid
        data.value = {
            uuid: object ? (object.uuid || '') : '',
        };
    } else if (cc.js.isChildClassOf(ctor, cc.Asset)) {
        data.value = {
            uuid: object ? (object._uuid || '') : '',
        };
    } else if (ctor && ctor.__props__) { // 如果构造器存在，且带有 __props__，则开始递归序列化内部属性
        if (object) { // 构造器存在，属性也存在
            data.value = {};

            ctor.__props__.map((key: string) => {
                if (!data.value) {
                    return;
                }
                const attrs = cc.Class.attr(ctor, key);
                data.value[key] = encodeObject(object[key], attrs);
            });
        } else { // 构造器存在，但是属性不存在，无法继续递归序列化内部属性
            data.value = null;
        }
    } else { // 上述判断都无法适用的情况下，直接将 object 赋值给 value
        data.value = object;
    }

    // 继承链
    if (ctor) {
        data.extends = getTypeInheritanceChain(ctor);
    }

    return data;
}
