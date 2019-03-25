'use strict';

declare const cc: any;
declare const Manager: any;

import {
    INode,
    IProperty,
    IScene,
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

    const emptyAttribute = {
        default: null,
    };

    const data: INode = {
        active: encodeObject(node.active, { default: null }),
        name: encodeObject(node.name || ctor.name, { default: null }),
        position: encodeObject(node._lpos, { default: new cc.Vec3() }),
        rotation: encodeObject(node.eulerAngles, { default: new cc.Vec3() }),
        scale: encodeObject(node._lscale, { default: new cc.Vec3(1, 1, 1) }),
        uuid: encodeObject(node.uuid, { default: null }),

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

    if (node._prefab && node._prefab.asset) {
        data.__prefab__ = {
            uuid: node._prefab.asset._uuid,
            rootUuid: node._prefab.root && node._prefab.root.uuid,
            sync: node._prefab.root && node._prefab.root._prefab.sync,
        };
    }

    return data;
}

/**
 * 编码一个场景数据
 * @param scene
 */
export function encodeScene(scene: any): IScene {
    const ctor = scene.constructor;

    const data: IScene = {
        active: encodeObject(scene.active, { default: null }),
        name: encodeObject(scene.name || ctor.name, { default: null }),
        uuid: encodeObject(scene.uuid, { default: null }),
        children: scene.children.map((child: any) => {
            return encodeObject(child, {
                ctor: cc.Node,
            });
        }),
        parent: '',
        __type__: getTypeName(ctor),
        _globals: {},
        isScene: true,
    };
    for (const name of Object.keys(scene._globals)) {
        if (name === '__id__') {
            continue;
        }
        data._globals[name] = encodeObject(scene._globals[name], { default: null });
    }
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
        default: undefined,
        type: getTypeName(ctor),
        readonly: false,
        visible: true,
    };

    // 遍历组件内所有属性
    ctor.__props__.map((key: string) => {
        if (!data.value) {
            return;
        }
        if (component[key] === undefined) {
            return;
        }
        const attrs = cc.Class.attr(ctor, key);
        data.value[key] = encodeObject(component[key], attrs);
    });

    // editor 附加数据
    data.editor = {
        inspector: ctor._inspector || '',
        icon: ctor._icon || '',
        help: ctor._help || '',
        _showTick:
            typeof component.start === 'function' ||
            typeof component.update === 'function' ||
            typeof component.lateUpdate === 'function' ||
            typeof component.onEnable === 'function' ||
            typeof component.onDisable === 'function',
    };

    // __scriptUuid
    if (data.value) {
        const scriptType: any = data.value.__scriptAsset;
        scriptType.visible = !!component.__scriptUuid;
        scriptType.value = { uuid: component.__scriptUuid };
    }

    // 继承链
    if (ctor) {
        data.extends = getTypeInheritanceChain(ctor);
    }

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
        default: defValue,
        type: getTypeName(ctor),
        readonly: !!attributes.readonly,
        visible: ('visible' in attributes) ? attributes.visible : true,
    };

    if (!attributes.ctor && attributes.type) {
        data.type = attributes.type;
    }

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

    if (attributes.hasOwnProperty('unit')) {
        data.unit = attributes.unit;
    }

    if (attributes.hasOwnProperty('displayOrder')) {
        data.displayOrder = attributes.displayOrder;
    }

    if (
        cc.js.isChildClassOf(ctor, cc.ValueType) ||
        data.type === 'cc.AnimationCurve'
    ) { // 如果是 valueType，则直接使用引擎序列化
        const dump = Manager.Utils.serialize(object, { stringify: false });
        delete dump.__type__;
        data.value = dump;
    } else if (data.type === 'cc.Gradient') {
        // 直接修改 object 会修改到默认值（对象引用问题）
        const dump = JSON.parse(JSON.stringify(object));
        if (object.colorKeys.length > 0) {
            object.colorKeys.forEach((item: any, index: number) => {
                const color = [];
                color[0] = item.color.r;
                color[1] = item.color.g;
                color[2] = item.color.b;
                dump.colorKeys[index].color = color;
            });
        }
        data.value = dump;
    } else if (data.isArray) {
        data.value = (object || []).map((item: any) => {
            // todo 需要确认数组类型的 attrs
            const childAttritube: any = Object.assign({}, attributes);
            childAttritube.default = null;
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
    } else if (data.type !== 'Unknown') { // 上述判断都无法适用的情况下，直接将 object 赋值给 value
        data.value = object;
    }

    // 继承链
    if (ctor) {
        data.extends = getTypeInheritanceChain(ctor);
    }

    return data;
}
