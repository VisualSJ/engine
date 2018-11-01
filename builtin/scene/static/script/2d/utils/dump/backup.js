var _ = require('lodash');

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

// var Flags = cc.Object.Flags;

let defaultType2CCType = {
    number: 'Float',
    string: 'String',
    boolean: 'Boolean',
    object: 'Object',
};

function getTypeId(obj) {
    if (typeof obj === 'object') {
        obj = obj.constructor;
    }
    return cc.js._getClassId(obj);
}

function dumpAttrs(types, data, attrs) {
    var type;
    var ctor = attrs.ctor;
    if (ctor) {
        type = getTypeId(ctor);
        data.type = type;
        if (!types[type]) {
            var isAssetType = cc.js.isChildClassOf(ctor, cc.RawAsset);
            var isNodeType = cc.js.isChildClassOf(ctor, cc.Node);
            if (isAssetType || isNodeType) {
                dumpInheritanceChain(types, ctor, type);
            } else {
                dumpType(types, ctor, type);
            }
        }
    } else if (attrs.type/* && attrs.allowDuckTypeInEditor !== true*/) {
        data.type = attrs.type;
    }

    if (attrs.readonly) {
        data.readonly = attrs.readonly;
    }

    if ('default' in attrs) {
        data.default = getDefault(attrs.default);
        if (attrs.saveUrlAsAsset && data.default === '') {
            data.default = null;
        } else if (data.default != null && !data.type) {
            // 为 inspector 提供类型信息
            type = ({
                number: 'Float',
                string: 'String',
                boolean: 'Boolean',
                object: 'Object'
            })[typeof data.default];
            if (type) {
                if (type !== 'Object' || data.default.constructor === Object) {
                    data.type = type;
                } else {
                    var defaultType = cc.js._getClassId(data.default.constructor);
                    if (defaultType) {
                        data.type = defaultType;
                    }
                }
            }
        }
    } else if (!attrs.hasSetter) {
        data.readonly = true;
    }

    if (typeof attrs.visible === 'boolean') {
        data.visible = attrs.visible;
    }
    if (attrs.enumList) {
        // we should deep copy every js object otherwise can not using in ipc
        data.enumList = JSON.parse(JSON.stringify(attrs.enumList));
    }
    if (attrs.hasOwnProperty('displayName')) {
        // data.displayName = Editor.i18n.format(attrs.displayName);
        data.displayName = attrs.displayName;
    }
    if (attrs.hasOwnProperty('multiline')) {
        data.multiline = attrs.multiline;
    }
    if (attrs.hasOwnProperty('min')) {
        data.min = attrs.min;
    }
    if (attrs.hasOwnProperty('max')) {
        data.max = attrs.max;
    }
    if (attrs.hasOwnProperty('step')) {
        data.step = attrs.step;
    }
    if (attrs.slide) {
        data.slide = attrs.slide;
    }
    if (attrs.nullable) {
        data.nullable = attrs.nullable;
    }
    if (attrs.tooltip) {
        // data.tooltip = Editor.i18n.format(attrs.tooltip);
        data.tooltip = attrs.tooltip;
    }
    if (attrs.hasOwnProperty('animatable')) {
        data.animatable = attrs.animatable;
    }
}

function getInheritanceChain(klass) {
    return cc.Class.getInheritanceChain(klass)
        .map((x) => {
            return getTypeId(x);
        })
        .filter((x) => x);
}

// assert(obj)
function dumpType(types, objOrClass, typeId) {
    var klass;
    if (typeof objOrClass === 'object') {
        var isEnum = cc.Enum.isEnum(objOrClass);
        if (isEnum) {
            // dump Enum
            var enumList = cc.Enum.getList(objOrClass);
            return enumList;
        } else {
            klass = objOrClass.constructor;
        }
    } else {
        klass = objOrClass;
    }

    var type = {};
    types[typeId] = type;

    // dump CCClass
    if (klass) {
        type.name = cc.js.getClassName(klass);
        if (type.name.startsWith('cc.')) {
            type.name = type.name.slice(3);
        }
        // TODO - cache in klass
        var chain = getInheritanceChain(klass);
        if (chain.length > 0) {
            type.extends = chain;
        }
        // dump props
        var propNames = klass.__props__;
        if (propNames) {
            var properties = {};
            for (var p = 0; p < propNames.length; p++) {
                var propName = propNames[p];
                var dumpProp = {};
                // dump inspector attrs
                var attrs = cc.Class.attr(objOrClass, propName);
                if (attrs) {
                    dumpAttrs(types, dumpProp, attrs);
                }
                properties[propName] = dumpProp;
            }
            if (isAnyChildClassOf(klass, cc._BaseNode, cc.Component)) {
                properties._id = {
                    type: cc.String,
                    visible: false
                };
            }
            type.properties = properties;
        }
    }

    return type;
}

function dumpInheritanceChain(types, klass, typeId) {
    var type = {};
    var chain = getInheritanceChain(klass);
    if (chain.length > 0) {
        type.extends = chain;
    }
    types[typeId] = type;
}

function getExpectedTypeInClassDef(types, klass, propName) {
    var typeId = getTypeId(klass);
    if (typeId) {
        var typeInfo = types[typeId];
        if (typeInfo) {
            return typeInfo.properties[propName].type;
        }
    }
    return null;
}

function dumpSceneObjRef(types, obj, expectedType) {
    var res = {
        value: {
            name: obj.isValid ? obj.name : undefined,
            uuid: obj.uuid,
        }
    };
    var actualType = getTypeId(obj);
    if (expectedType !== actualType) {
        if (!types[actualType]) {
            dumpType(types, obj.constructor, actualType);
        }
        res.type = actualType;
    } else {
        res.type = expectedType;
    }
    return res;
}

function dumpObjectField(types, obj, expectedType) {
    if (!obj) {
        return {
            type: 'Object',
            value: null,
        };
    }

    var actualType;
    var ctor = obj.constructor;
    if (obj instanceof cc.Object) {
        // cc.Object
        if (obj instanceof cc.Asset) {
            var uuid = obj._uuid;
            // Asset
            actualType = getTypeId(obj);
            if (expectedType !== actualType) {
                if (!types[actualType]) {
                    dumpType(types, ctor, actualType);
                }
                return {
                    type: actualType,
                    value: {
                        uuid: uuid
                    }
                };
            } else {
                return {
                    type: expectedType,
                    value: {
                        uuid: uuid
                    }
                };
            }
        }

        if (cc.Node.isNode(obj) || obj instanceof cc.Component) {
            return dumpSceneObjRef(types, obj, expectedType);
        }
    } else if (obj instanceof cc.ValueType) {
        var res = Manager.serialize(obj, { stringify: false });
        if (!types[res.__type__]) {
            dumpInheritanceChain(types, ctor, res.__type__);
        }
        var type = res.__type__;
        delete res.__type__;
        return {
            type: type,
            value: res
        };
    }

    if (cc.Class._isCCClass(ctor)) {
        // dump embeded fireclass
        var data = {};
        actualType = getTypeId(obj);
        if (expectedType !== actualType) {
            if (!types[actualType]) {
                dumpType(types, ctor, actualType);
            }
            data.type = actualType;
        } else {
            data.type = expectedType;
        }
        // TODO - 如果嵌套怎么办？考虑在下面这次 dumpByClass 时，只支持值类型。
        dumpByClass(types, data, obj, ctor);
        return data;
    }

    return {
        type: 'Object',
        value: null,
    };
}

function checkPropVisible(object, func) {
    try {
        return func.call(object);
    } catch (e) {
        console.error(e);
    }
    return checkPropVisible.ERRORED;
}
checkPropVisible.ERRORED = {};

function dumpField(types, val, klass, propName, attrs) {
    var expectedType = getExpectedTypeInClassDef(types, klass, propName);

    // convert url to uuid
    if (attrs.saveUrlAsAsset) {
        var type = attrs.ctor;
        if (typeof type === 'function' && cc.js.isChildClassOf(type, cc.RawAsset)) {
            if (typeof val === 'string') {
                console.error('The url cannot be converted to uuid for the time being');
                return;
                // return {
                //     type: expectedType,
                //     value: {
                //         uuid: val && Editor.Utils.UuidCache.urlToUuid(val) || ''
                //     }
                // };
            }
        }
    }

    if (typeof val === 'object' || typeof val === 'undefined') {
        // DELME
        // if (val instanceof _ccsg.Node) {
        //     return undefined;
        // }

        var res = dumpObjectField(types, val, expectedType);

        // dump dummy value for inspector
        if (!res.value) {
            if (attrs.ctor) {
                var ctor = attrs.ctor;
                if (isAnyChildClassOf(ctor, cc.Node, cc.RawAsset, cc.Component)) {
                    return {
                        type: expectedType,
                        value: {
                            uuid: '',
                        }
                    };
                }
            } else {
                return {
                    type: 'Object',
                    value: null
                };
            }
        }

        return res;
    } else if (typeof val === 'function') {
        return null;
    } else {
        var currentType = defaultType2CCType[typeof val];
        if (expectedType === 'Enum' && typeof val === 'number') {
            currentType = 'Enum';
        }
        if (expectedType === 'Integer' || expectedType === 'Float') {
            if (currentType === 'Float') {
                currentType = expectedType;
            }
        }

        return {
            type: currentType,
            value: val
        };
    }
}

function dumpProperty(types, val, klass, propName, obj) {
    var expectedType = getExpectedTypeInClassDef(types, klass, propName);
    var attrs = cc.Class.attr(klass, propName);
    var res;
    if (Array.isArray(val)) {
        res = {
            type: expectedType,
            value: _.map(val, function(item) {
                return dumpField(types, item, klass, propName, attrs);
            })
        };
    } else if (val == null && Array.isArray(getDefault(attrs.default))) {
        res = {
            type: 'Object',
            value: null,
        };
    } else {
        res = dumpField(types, val, klass, propName, attrs);
    }
    if (typeof attrs.visible === 'function') {
        var visible = checkPropVisible(obj, attrs.visible);
        if (visible !== checkPropVisible.ERRORED) {
            res.visible = !!visible;
        }
    }
    return res;
}

function dumpByClass(types, data, obj, klass) {
    var props = klass.__props__;
    if (props) {
        var res = {};
        for (var p = 0; p < props.length; p++) {
            var propName = props[p];
            var value = obj[propName];
            res[propName] = dumpProperty(types, value, klass, propName, obj);
        }
        data.value = res;
    }
}

// assert(obj && typeof obj === 'object')
function dumpNode(types, node) {
    var OriginProps = ['name', 'opacity', 'active', 'angle', 'group', 'is3DNode'];

    if (node instanceof cc.Scene) { // cc.Scene 节点 dump 数据的时候 active 属性会报错
        const excludes = ['active'];
        OriginProps.splice(OriginProps.findIndex((name) => excludes.includes(name)), 1);
    }

    var HasAttrsProps = OriginProps.concat(['position', 'color']);
    var p;
    var propName;
    var data = {};

    // dump node type
    var typeId = getTypeId(node);
    if (typeId) {
        data.__type__ = typeId;
        var nodeType = {
            name: 'Node',
            extends: getInheritanceChain(cc.Node),
        };
        types[typeId] = nodeType;

        var properties = {};
        for (p = 0; p < HasAttrsProps.length; p++) {
            propName = HasAttrsProps[p];
            var dumpProp = {};
            var attrs = cc.Class.attr(cc.Node, propName);
            if (attrs) {
                dumpAttrs(types, dumpProp, attrs);
            }
            properties[propName] = dumpProp;
        }

        properties.angle.readonly = false; // NodeUtils._hasFlagInComponents(node, Flags.IsRotationLocked);
        properties.position.readonly = false; // NodeUtils._hasFlagInComponents(node, Flags.IsPositionLocked);

        properties.anchor = {
            readonly: false, // NodeUtils._hasFlagInComponents(node, Flags.IsAnchorLocked),
        };
        dumpType(types, cc.Vec2, 'cc.Vec2');
        dumpType(types, cc.Vec3, 'cc.Vec3');
        properties.size = {
            readonly: false, // NodeUtils._hasFlagInComponents(node, Flags.IsSizeLocked),
        };
        dumpType(types, cc.Size, 'cc.Size');
        properties.scale = {
            readonly: false, // NodeUtils._hasFlagInComponents(node, Flags.IsScaleLocked),
        };
        properties.skew = {};
        // properties.__prefab__ = {};
        dumpType(types, cc.Color, 'cc.Color');
        nodeType.properties = properties;
    }

    // dump node value
    for (p = 0; p < OriginProps.length; p++) {
        propName = OriginProps[p];
        data[propName] = dumpProperty(types, node[propName], cc.Node, propName, node);
    }
    data.uuid = { type: 'String', value: node.uuid };
    data.anchor = dumpObjectField(types, new cc.Vec2(node.anchorX, node.anchorY));
    data.size = dumpObjectField(types, new cc.Size(node.width, node.height));
    data.skew = dumpObjectField(types, new cc.Vec2(node.skewX, node.skewY));
    data.color = dumpObjectField(types, node.color.setA(node.opacity));

    if (node.is3DNode) {
        data.position = dumpObjectField(types, node.getPosition(cc.v3()));
        data.scale = dumpObjectField(types, node.getScale(cc.v3()));
        data.eulerAngles = dumpObjectField(types, node.eulerAngles);
    } else {
        data.position = dumpObjectField(types, node.getPosition(cc.v2()));
        data.scale = dumpObjectField(types, node.getScale(cc.v2()));
    }

    // prefab
    if (node._prefab) {
        let root = node._prefab.root;
        let asset = root && root._prefab.asset;
        data.__prefab__ = {
            uuid: asset && asset._uuid,
            rootName: root && root.name,
            rootUuid: root && root.uuid,
            sync: root && root._prefab.sync,
        };
    }

    // components
    var components = node._components;
    if (components) {
        data.__comps__ = [];
        for (var i = 0; i < components.length; i++) {
            var comp = components[i];
            var compCtor = comp.constructor;
            typeId = getTypeId(compCtor);
            if (typeId) {
                // dump component type
                var compType = dumpType(types, comp, typeId);
                var canDisable = typeof comp.start === 'function' ||
                    typeof comp.update === 'function' ||
                    typeof comp.lateUpdate === 'function' ||
                    typeof comp.onEnable === 'function' ||
                    typeof comp.onDisable === 'function';
                compType.editor = {
                    inspector: compCtor.hasOwnProperty('_inspector') && compCtor._inspector,
                    icon: compCtor.hasOwnProperty('_icon') && compCtor._icon,
                    help: compCtor._help,
                    _showTick: canDisable
                };
                // dump component values
                var compValue = {
                    type: typeId,
                };
                dumpByClass(types, compValue, comp, compCtor);
                compValue.value._id = {
                    type: 'string',
                    value: comp._id,
                };
                data.__comps__.push(compValue);

                // dump script
                var scriptType = compType.properties.__scriptAsset;
                scriptType.visible = !!comp.__scriptUuid;
                compValue.value.__scriptAsset.value = {
                    uuid: comp.__scriptUuid
                };
            }
        }
    }

    return data;
}

module.exports = {
    dumpNode,
    dumpProperty,
    dumpAttrs,
    dumpByClass,
    dumpField,
    dumpInheritanceChain,
    checkPropVisible,
    dumpObjectField,
    dumpSceneObjRef,
    dumpType,
    getExpectedTypeInClassDef,
    getInheritanceChain,
    getTypeId,
};

/**
 * Take a snapshot on node for inspector.
 * @method getNodeDump
 * @param {cc.Node} node
 * @return {object} - a json object
 */
// module.exports = function(node) {
//     if (!node) {
//         return {
//             types: {},
//             value: null
//         };
//     }
//     var types = {};
//     return {
//         types: types,
//         value: dumpNode(types, node)
//     };
// };

// for unit tests
// module.exports.getInheritanceChain = getInheritanceChain;
