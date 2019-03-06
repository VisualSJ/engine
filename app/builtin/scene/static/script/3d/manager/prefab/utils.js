'use strict';

/**
 * 递归循环所有的子节点，执行 handle 方法
 * @param {*} node
 * @param {*} handle
 */
exports.walkNode = function(node, handle) {
    if (handle(node) === false) {
        return;
    }

    const children = node._children;
    for (let i = children.length - 1; i >= 0; --i) {
        exports.walkNode(children[i], handle);
    }
};

// 遍历节点下的所有可序列化字段(不含子节点)
// 只会遍历非空的 object 类型
exports.visitObjTypeReferences = function(node, visitor) {
    function parseFireClass(obj, klass) {
        klass = klass || obj.constructor;
        var props = klass.__values__;
        for (var p = 0; p < props.length; p++) {
            var key = props[p];
            var value = obj[key];
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    for (var i = 0; i < value.length; i++) {
                        if (cc.isValid(value)) {
                            visitor(value, '' + i, value[i]);
                        }
                    }
                } else if (cc.isValid(value)) {
                    visitor(obj, key, value);
                }
            }
        }
    }

    for (var c = 0; c < node._components.length; ++c) {
        var component = node._components[c];
        parseFireClass(component);
    }
};

exports.getDumpableNode = function(node, quiet) {

    // deep clone, since we dont want the given node changed by codes below
    node = cc.instantiate(node);

    exports.walkNode(node, function(item) {
        // strip other node or components references
        exports.visitObjTypeReferences(item, function(obj, key, val) {
            var shouldStrip = false;
            var targetName;
            if (val instanceof cc.Component.EventHandler) {
                val = val.target;
            }
            if (val instanceof cc.Component) {
                val = val.node;
            }
            if (val instanceof cc._BaseNode) {
                if (!val.isChildOf(node)) {
                    shouldStrip = true;
                    targetName = val.name;
                }
            }
            if (shouldStrip) {
                obj[key] = null;
                if (!CC_TEST && !quiet) {
                    console.error(
                        'Reference "%s" of "%s" to external scene object "%s" can not be saved in prefab asset.',
                        key, obj.name || node.name, targetName
                    );
                }
            }
        });

        // 清空 prefab 中的 uuid，这些 uuid 不会被用到，不应该保存到 prefab 资源中，以免每次保存资源都发生改变。
        item._id = '';
        for (var c = 0; c < item._components.length; ++c) {
            var component = item._components[c];
            component._id = '';
        }
    });

    node._prefab.sync = false;  // not syncable by default

    return node;
};
