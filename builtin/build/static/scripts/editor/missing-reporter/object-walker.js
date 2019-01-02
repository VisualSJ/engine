
var CCAsset = cc.Asset;
var Attr = cc.Class.Attr;
var DELIMETER = Attr.DELIMETER;
var SERIALIZABLE = DELIMETER + 'serializable';
var getClassId = cc.js._getClassId;

// ObjectWalkerBehavior

function ObjectWalkerBehavior(root) {
    this.root = root;
}

// walk(obj, key, val)
ObjectWalkerBehavior.prototype.walk = null;

ObjectWalkerBehavior.prototype.parseObject = function(val) {
    if (Array.isArray(val)) {
        this.forEach(val);
    } else {
        var klass = val.constructor;

        if (val instanceof CCAsset ||                       // skip Asset
            (klass !== Object && !getClassId(val, false))   // skip non-serializable or other type objects
        ) {
            if (val !== this.root) {
                return;
            }
        }

        var props = klass && klass.__props__;
        if (props) {
            // CCClass or fastDefine
            this.parseCCClass(val, klass, props);
        } else {
            this.forIn(val);
        }
    }
};

ObjectWalkerBehavior.prototype.parseCCClass = function(val, klass, props) {
    var attrs = Attr.getClassAttrs(klass);
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        if (attrs[prop + SERIALIZABLE] === false) {
            continue;
        }
        this.walk(val, prop, val[prop]);
    }
};

ObjectWalkerBehavior.prototype.forIn = function(val) {
    for (var key in val) {
        if (val.hasOwnProperty(key) &&
            (key.charCodeAt(0) !== 95 || key.charCodeAt(1) !== 95)  // not starts with __
        ) {
            this.walk(val, key, val[key]);
        }
    }
};

ObjectWalkerBehavior.prototype.forEach = function(val) {
    for (var i = 0, len = val.length; i < len; ++i) {
        this.walk(val, '' + i, val[i]);
    }
};

// ObjectWalker

// Traverse all objects recursively.
// Each object will be navigated only once in the value parameter in callback.
function ObjectWalker(root, iteratee, options) {
    ObjectWalkerBehavior.call(this, root);
    this.iteratee = iteratee;
    this.parsedObjects = [];
    this.parsedKeys = [];

    this.walked = new Set();
    this.walked.add(root);

    this.ignoreParent = options && options.ignoreParent;
    if (this.ignoreParent) {
        if (this.root instanceof cc.Component) {
            this.ignoreParent = this.root.node;
        } else if (this.root instanceof cc._BaseNode) {
            this.ignoreParent = this.root;
        } else {
            return cc.error('can only ignore parent of scene node');
        }
    }

    this.parseObject(root);
}
cc.js.extend(ObjectWalker, ObjectWalkerBehavior);

ObjectWalker.prototype.walk = function(obj, key, val) {
    var isObj = val && typeof val === 'object';
    if (isObj) {
        if (this.walked.has(val)) {
            return;
        }
        if (this.ignoreParent) {
            if (val instanceof cc._BaseNode) {
                if (!val.isChildOf(this.ignoreParent)) {
                    return;
                }
            } else if (val instanceof cc.Component) {
                if (!val.node.isChildOf(this.ignoreParent)) {
                    return;
                }
            }
        }
        this.walked.add(val);

        this.iteratee(obj, key, val, this.parsedObjects, this.parsedKeys);

        this.parsedObjects.push(obj);
        this.parsedKeys.push(obj);

        this.parseObject(val);

        this.parsedObjects.pop();
        this.parsedKeys.pop();
    }
};

// FACADE

/**
 * Traverse all objects recursively
 * @param {Object} root
 * @param {Function} iteratee
 * @param {Object} iteratee.object
 * @param {String} iteratee.property
 * @param {Object} iteratee.value - per object will be navigated ONLY once in this parameter
 * @param {Object[]} iteratee.parsedObjects - parsed object path, NOT contains the "object" parameter
 */
function walk(root, iteratee) {
    new ObjectWalker(root, iteratee);
}

var staticDummyWalker = new ObjectWalkerBehavior(null);
staticDummyWalker.walk = null;

// enumerate properties not recursively
function doWalkProperties(obj, iteratee) {
    var SKIP_INVALID_TYPES_EVEN_IF_ROOT = null;
    staticDummyWalker.root = SKIP_INVALID_TYPES_EVEN_IF_ROOT;
    staticDummyWalker.walk = iteratee;
    staticDummyWalker.parseObject(obj);
}

/**
 * Traverse all object's properties recursively
 * @param {Object}   root
 * @param {Function} iteratee
 * @param {Object}     iteratee.object
 * @param {String}     iteratee.property - per object property will be navigated ONLY once in this parameter
 * @param {Object}     iteratee.value - per object may be navigated MORE than once in this parameter
 * @param {Object[]}   iteratee.parsedObjects - parsed object path, NOT contains the "object" parameter
 * @param {Object}   [options]
 * @param {Boolean}    [options.dontSkipNull = false]
 */
function walkProperties(root, iteratee, options) {
    var dontSkipNull = options && options.dontSkipNull;
    new ObjectWalker(root, function(obj, key, value, parsedObjects) {
        // 如果 value 已经遍历过，ObjectWalker 不会枚举其余对象对 value 的引用
        // 所以这里拿到 value 后自己再枚举一次 value 内的引用
        var noPropToWalk = !value || typeof value !== 'object';
        if (noPropToWalk) {
            return;
        }
        parsedObjects.push(obj);
        doWalkProperties(value, function(obj, key, val) {
            var isObj = typeof val === 'object';
            if (isObj) {
                if (dontSkipNull || val) {
                    iteratee(obj, key, val, parsedObjects);
                }
            }
        });
        parsedObjects.pop();
    }, options);
}

function getNextProperty(parsedObjects, parsingObject, object) {
    var nextObj;
    var i = parsedObjects.lastIndexOf(object);
    if (i === parsedObjects.length - 1) {
        nextObj = parsingObject;
    } else if (0 <= i && i < parsedObjects.length - 1) {
        nextObj = parsedObjects[i + 1];
    } else {
        return '';
    }
    var foundKey = '';
    doWalkProperties(object, function(obj, key, val) {
        if (val === nextObj) {
            foundKey = key;
        }
    });
    return foundKey;
}

module.exports = { walk, walkProperties, getNextProperty, ObjectWalkerBehavior };
