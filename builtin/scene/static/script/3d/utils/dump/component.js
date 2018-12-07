'use stirct';

const type = require('./type');

/**
 * 生成一个 component 的 dump 数据
 * @param {*} component
 */
function dump(component) {
    const ctor = component.constructor;
    const ID = type.getID(ctor);

    if (!ID) {
        return null;
    }

    const dump = type.dump(ctor);
    dump.type = ID;

    // 补全 editor 使用的数据
    dump.editor = {
        inspector: ctor.hasOwnProperty('_inspector') && ctor._inspector,
        icon: ctor.hasOwnProperty('_icon') && ctor._icon,
        help: ctor._help,
        _showTick:
            typeof component.start === 'function' ||
            typeof component.update === 'function' ||
            typeof component.lateUpdate === 'function' ||
            typeof component.onEnable === 'function' ||
            typeof component.onDisable === 'function',
    };

    dump.value = {};

    if (ctor.__props__) {
        ctor.__props__.forEach((name) => {
            const value = component[name];
            const propType = dump.properties[name].type;
            const attrs = cc.Class.attr(ctor, name);

            const defaultDump = type.dump(attrs.ctor);

            if (Array.isArray(value)) {
                dump.value[name] = {
                    ...defaultDump,
                    type: 'Array',
                    value: value.map((item, key) => {
                        return dumpField(value, key, propType, attrs);
                    }),
                };
            } else if (value === null && Array.isArray(type.getDefault(attrs.default))) {
                dump.value[name] = { ...defaultDump, type: 'Object', value: null };
            } else {
                dump.value[name] = dumpField(component, name, propType, attrs);
            }

            // todo 检查 visiable 属性
            if (typeof attrs.visible === 'function') {
                var visible = checkPropVisible(component, attrs.visible);
                if (visible !== checkPropVisible.ERRORED) {
                    dump[name].visible = !!visible;
                }
            }
        });

        // to display __scriptAsset property in inspector
        const scriptType = dump.properties.__scriptAsset;
        scriptType.visible = !!component.__scriptUuid;
        dump.value.__scriptAsset.value = { uuid: component.__scriptUuid };
    }
    return dump;
}

function dumpSceneObjRef(obj) {
    const dump = type.dump(obj.constructor);
    dump.value = {
        name: obj.isValid ? obj.name : undefined,
        uuid: obj.uuid,
    };
    dump.type = type.getID(obj);
    return dump;
}

function dumpByClass(obj) {
    const ctor = obj.constructor;
    const compType = type.dump(ctor);

    const dump = type.dump(ctor);
    dump.type = type.getID(ctor);
    dump.value = {};

    if (ctor.__props__) {
        ctor.__props__.forEach((name) => {
            const value = component[name];
            const propType = compType.properties[name].type;
            const attrs = cc.Class.attr(ctor, name);

            if (Array.isArray(value)) {
                dump.value[name] = {
                    type: propType,
                    value: value.map((item) => {
                        return dumpField(item, ctor, propName, attrs);
                    }),
                };
            } else if (value === null && Array.isArray(type.getDefault(attrs.default))) {
                dump.value[name] = {
                    type: 'Object',
                    value: null,
                };
            } else {
                dump.value[name] = dumpField(component, name, propType, attrs);
            }

            // todo 检查 visiable 属性
            if (typeof attrs.visible === 'function') {
                var visible = checkPropVisible(component, attrs.visible);
                if (visible !== checkPropVisible.ERRORED) {
                    dump.value[name].visible = !!visible;
                }
            }
        });
    }
    return dump;
}

function dumpObjectField(obj, expectedType) {
    if (!obj) {
        return { type: 'Object', value: null };
    }

    const ctor = obj.constructor;

    // 引擎对象
    if (obj instanceof cc.Object) {
        // 资源对象
        if (obj instanceof cc.Asset) {
            const objType = type.getID(obj);

            const dump = type.dump(ctor);
            dump.type = objType;
            dump.value = { uuid: obj._uuid };
            return dump;
        }

        if (cc.Node.isNode(obj) || obj instanceof cc.Component) {
            return dumpSceneObjRef(obj, expectedType);
        }
    }

    // 引擎数据类型
    if (obj instanceof cc.ValueType) {
        const result = Manager.serialize(obj, { stringify: false });

        const dump = type.dump(ctor);
        dump.type = result.__type__;
        delete result.__type__;
        dump.value = result;

        const list = type.getInheritanceChain(ctor);
        if (list && list.length) {
            dump.extends = list;
        }

        return dump;
    }

    if (cc.Class._isCCClass(ctor)) {
        // dump embeded fireclass
        const result = {};
        // const objType = type.getID(obj);

        // const dump = type.dump(ctor);
        // if (expectedType !== actualType) {
        // if (!types[actualType]) {
        //     dumpType(types, ctor, actualType);
        // }
        // }

        // data.type = objType;

        // TODO - 如果嵌套怎么办？考虑在下面这次 dumpByClass 时，只支持值类型。
        return dumpByClass(obj, ctor);
    }

    return { type: 'Object', value: null };
}

/**
 *
 * @param {*} component
 * @param {*} key
 * @param {*} expectedType
 * @param {*} attrs
 */
function dumpField(component, key, expectedType, attrs) {
    const ctor = attrs.ctor;
    const dump = type.dump(ctor);

    if (attrs.saveUrlAsAsset) {
        if (
            typeof ctor === 'function' &&
            cc.js.isChildClassOf(ctor, cc.RawAsset) &&
            typeof component[key] === 'string'
        ) {
            dump.type = expectedType;
            dump.value = { uuid: component[key] || '' };

            return dump;
        }
    }

    if (typeof component[key] === 'object' || typeof component[key] === 'undefined') {
        const result = dumpObjectField(component[key], expectedType);
        // dump dummy value for inspector
        if (!result.value) {
            if (attrs.ctor) {
                const ctor = attrs.ctor;
                if (type.isAnyChildClassOf(ctor, cc.Node, cc.RawAsset, cc.Component)) {
                    result.type = expectedType;
                    result.value = { uuid: '' };
                }
            } else {
                result.type = 'Object';
                result.value = null;
            }
        }
        return { ...dump, ...result };
    }

    if (typeof component[key] === 'function') {
        return null;
    }

    let currentType = (typeof component[key]).replace(/^\s/, (str) => {
        return str.toUpperCase();
    });
    if (expectedType === 'Enum' && typeof component[key] === 'number') {
        currentType = 'Enum';
    }
    if (expectedType === 'Integer' || expectedType === 'Float') {
        if (currentType === 'Float') {
            currentType = expectedType;
        }
    }

    dump.type = currentType;
    dump.value = component[key];

    return dump;
}

function checkPropVisible(object, func) {
    try {
        return func.call(object);
    } catch (err) {
        console.error(err);
    }
    return checkPropVisible.ERRORED;
}

checkPropVisible.ERRORED = {};

module.exports = {
    dump,
};
