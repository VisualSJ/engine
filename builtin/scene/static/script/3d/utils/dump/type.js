'use strict';

/**
 * 获取一个类型的 dump 数据
 * @param {*} ctor
 */
function dump(ctor) {
    const type = {};

    if (typeof ctor === 'object') {
        if (cc.Enum.isEnum(ctor)) {
            return cc.Enum.getList(ctor);
        } else {
            ctor = ctor.constructor;
        }
    }

    if (!ctor) {
        return type;
    }

    // name
    type.name = cc.js.getClassName(ctor);
    if (type.name.startsWith('cc.')) {
        type.name = type.name.slice(3);
    }

    // extends
    const chain = getInheritanceChain(ctor);
    if (chain.length > 0) {
        type.extends = chain;
    }

    // properties
    if (ctor.__props__) {
        const properties = {};

        ctor.__props__.forEach((name) => {
            const attrs = cc.Class.attr(ctor, name);
            if (attrs) {
                properties[name] = dumpAttribute(attrs);
            } else {
                properties[name] = {};
            }
        });

        if (isAnyChildClassOf(ctor, cc._BaseNode, cc.Component)) {
            properties._id = {
                type: cc.String,
                visible: false,
            };
        }

        type.properties = properties;
    }

    return type;
}

/**
 * 使用引擎接口，获取一个对象的类型
 * @param {*} obj
 */
function getID(obj) {
    if (typeof obj === 'object') {
        obj = obj.constructor;
    }
    return cc.js._getClassId(obj);
}

/**
 * 获取一个类型的继承链数据
 * @param {*} ctor
 */
function getInheritanceChain(ctor) {
    return cc.Class.getInheritanceChain(ctor)
        .map((x) => {
            return getID(x);
        })
        .filter((x) => x);
}

/**
 * 返回一个属性 dump 数据
 * @param {*} attrs
 */
function dumpAttribute(attrs) {
    const attribute = {};

    if (attrs.ctor) {
        const type = getID(attrs.ctor);
        attribute.type = type;
        // todo 确认需不需要这个类型的定义数据
    } else if (attrs.type) {
        attribute.type = attrs.type;
    }

    if (attrs.readonly) {
        attribute.readonly = attrs.readonly;
    }

    if ('default' in attrs) {
        attribute.default = getDefault(attrs.default);

        if (attrs.saveUrlAsAsset && attribute.default === '') {
            attribute.default = null;
        } else if (attribute.default !== null && !attribute.type) {
            // 如果类型没有正常获取，并且有默认值，则使用默认值的类型作为类型
            attribute.type = (typeof attribute.default).replace(/^\s/, (str) => {
                return str.toUpperCase();
            });

            if (attribute.type) {
                if (attribute.type !== 'Object' || attribute.default.constructor === Object) {
                    // attribute.type = type;
                } else {
                    const defaultType = cc.js._getClassId(attribute.default.constructor);
                    if (defaultType) {
                        attribute.type = defaultType;
                    }
                }
            }
        }
    } else if (!attrs.hasSetter) {
        attribute.readonly = true;
    }

    if (typeof attrs.visible === 'boolean') {
        attribute.visible = attrs.visible;
    }
    if (attrs.enumList) {
        // we should deep copy every js object otherwise can not using in ipc
        attribute.enumList = JSON.parse(JSON.stringify(attrs.enumList));
    }
    if (attrs.hasOwnProperty('displayName')) {
        // data.displayName = Editor.i18n.format(attrs.displayName);
        attribute.displayName = attrs.displayName;
    }
    if (attrs.hasOwnProperty('multiline')) {
        attribute.multiline = attrs.multiline;
    }
    if (attrs.hasOwnProperty('min')) {
        attribute.min = attrs.min;
    }
    if (attrs.hasOwnProperty('max')) {
        attribute.max = attrs.max;
    }
    if (attrs.hasOwnProperty('step')) {
        attribute.step = attrs.step;
    }
    if (attrs.slide) {
        attribute.slide = attrs.slide;
    }
    if (attrs.nullable) {
        attribute.nullable = attrs.nullable;
    }
    if (attrs.tooltip) {
        // data.tooltip = Editor.i18n.format(attrs.tooltip);
        attribute.tooltip = attrs.tooltip;
    }
    if (attrs.hasOwnProperty('animatable')) {
        attribute.animatable = attrs.animatable;
    }

    return attribute;
}

//////////////

/**
 * 是否是任意一个父类的子类
 * @param {Function} subClass
 * @param {Function} ...superClasses
 */
function isAnyChildClassOf(subClass, ...superClasses) {
    for (var i = 0; i < superClasses.length; ++i) {
        if (cc.js.isChildClassOf(subClass, superClasses[i])) {
            return true;
        }
    }
    return false;
}

/**
 * 获取一个数据的默认值
 * @param {*} defaultVal
 */
function getDefault(defaultVal) {
    if (typeof defaultVal === 'function') {
        try {
            return defaultVal();
        } catch (error) {
            cc._throw(error);
            return undefined;
        }
    }
    return defaultVal;
}

module.exports = {
    dump,
    getID,
    getInheritanceChain,
    getDefault,
    isAnyChildClassOf,
};
