
var compressUuid = require('./uuid').compressUuid;

var CCObject = cc.Object;
var CCAsset = cc.Asset;
var CCBaseNode = cc._BaseNode;
var CCNode = cc.Node;
var CCComponent = cc.Component;

var Def = CCObject.Flags;
var PersistentMask = Def.PersistentMask;
var DontSave = Def.DontSave;
var EditorOnly = Def.EditorOnly;

function equalsToDefault (def, value) {
    if (typeof def === 'function') {
        try {
            def = def();
        }
        catch (e) {
            return false;
        }
    }
    if (def === value) {
        return true;
    }
    if (def && value) {
        if (def instanceof cc.ValueType && def.equals(value)) {
            return true;
        }
        if ((Array.isArray(def) && Array.isArray(value)) ||
            (def.constructor === Object && value.constructor === Object)
        ) {
            try {
                return Array.isArray(def) && Array.isArray(value) && def.length === 0 && value.length === 0;
            }
            catch (e) {
            }
        }
    }
    return false;
};

var nicifySerialized = require('./serialize-nicify');

// Prefab 子节点允许定制的属性，其它属性和 prefab 资源保持同步
var PRESERVE_PROPS_FOR_SYNCABLE_PREFAB = ['_objFlags', '_parent', '_id', '_prefab'];
// Prefab 根节点允许定制的属性，其它属性和 prefab 资源保持同步
var PRESERVE_PROPS_FOR_SYNCABLE_PREFAB_ROOT = PRESERVE_PROPS_FOR_SYNCABLE_PREFAB.concat(
    '_name', '_active', '_position', '_rotationX', '_rotationY', '_localZOrder', '_globalZOrder');

function _Serializer(obj, options) {
    options = options || {};
    this._exporting = options.exporting;
    this._discardInvalid = 'discardInvalid' in options ? options.discardInvalid : true;
    this._dontStripDefault = !this._exporting || ('dontStripDefault' in options ? options.dontStripDefault : true);
    this._missingClassReporter = options.missingClassReporter;
    this._missingObjectReporter = options.missingObjectReporter;

    // {string} uuid : {boolean} missing
    this._assetExists = this._missingObjectReporter && {};

    this.serializedList = [];  // list of serialized data for all cc.Object objs
    this._parsingObjs = [];    // 记录当前引用对象，防止循环引用
    this._parsingData = [];    // 记录当前引用对象的序列化结果
    this._objsToResetId = [];
    this._discardContentsForSyncablePrefab = !options.reserveContentsForSyncablePrefab && !(obj instanceof cc.Prefab);

    _serializeMainObj(this, obj);

    for (var i = 0; i < this._objsToResetId.length; ++i) {
        this._objsToResetId[i].__id__ = undefined;
    }

    this._parsingObjs = null;
    this._parsingData = null;
    this._objsToResetId = null;
}

// even array may caused circular reference, so we'd be better check it all the time, 否则就要像unity限制递归层次，有好有坏
function _checkCircularReference (self, obj) {
    var parsingIndex = self._parsingObjs.indexOf(obj);
    var circularReferenced = (parsingIndex !== -1);
    if (circularReferenced) {
        // register new referenced object
        var id = self.serializedList.length;
        obj.__id__ = id;        // we add this prop dynamically to simply lookup whether an obj has been serialized.
                                // If it will lead to performance degradations in V8, we just need to save ids to another table.
        self._objsToResetId.push(obj);
        var data = self._parsingData[parsingIndex];
        if (Array.isArray(obj) === false) {
            //data.__id__ = id;   // also save id in source data, just for debugging
            var type = cc.js._getClassId(obj, false);
            if (type) {
                data.__type__ = type;
            }
        }
        self.serializedList.push(data);
        return data;
    }
}

function checkMissingAsset (self, asset, uuid) {
    if (self._missingObjectReporter) {
        var exists = self._assetExists[uuid];
        if (exists === undefined) {
            exists = self._assetExists[uuid] = !!Editor.assetdb.remote.uuidToFspath(uuid);
        }
        if (!exists) {
            self._missingObjectReporter(asset);
        }
    }
}

var Attr = cc.Class.Attr;
var EDITOR_ONLY = Attr.DELIMETER + 'editorOnly';
var SERIALIZABLE = Attr.DELIMETER + 'serializable';
var DEFAULT = Attr.DELIMETER + 'default';
var SAVE_URL_AS_ASSET = Attr.DELIMETER + 'saveUrlAsAsset';
var FORMERLY_SERIALIZED_AS = Attr.DELIMETER + 'formerlySerializedAs';

function enumerateByFireClass (self, obj, data, fireClass, customProps) {
    function serializeUrlField (url) {
        if (!url) {
            return undefined;
        }
        var uuid;
        if (typeof url === 'string') {
            uuid = Editor.Utils.UuidCache.urlToUuid(url);
        }
        else if (url instanceof CCAsset) {
            uuid = url._uuid;   // 这里是为了兼容 deserialize 的 createAssetRefs 后的数据
            if (!uuid) {
                cc.error('The url must be "string" type');
                return undefined;
            }
        }
        if (uuid) {
            checkMissingAsset(self, url, uuid);
            if (self._exporting) {
                uuid = compressUuid(uuid, true);
            }
            return { __uuid__: uuid };
        }
        return undefined;
    }

    var attrs = Attr.getClassAttrs(fireClass);
    var props = customProps || fireClass.__props__;
    for (var p = 0; p < props.length; p++) {
        var propName = props[p];
        if (attrs[propName + SERIALIZABLE] === false) {
            continue;
        }
        var val = obj[propName];
        if (self._exporting) {
            if (attrs[propName + EDITOR_ONLY]) {
                var isNode = CCNode && CCNode.isNode(obj);
                var retainPrefabInfo = isNode && customProps && propName === '_prefab';
                if ( !retainPrefabInfo ) {
                    // skip editor only when exporting
                    continue;
                }
            }
            if (!self._dontStripDefault && equalsToDefault(attrs[propName + DEFAULT], val)) {
                continue;
            }
        }
        if (attrs[propName + SAVE_URL_AS_ASSET]) {
            if (Array.isArray(val)) {
                data[propName] = val.map(serializeUrlField);
            }
            else {
                data[propName] = serializeUrlField(val);
            }
        }
        else {
            // undefined value (if dont save) will be stripped from JSON
            data[propName] = _serializeField(self, val);
        }
        var formerlySerializedAs = attrs[propName + FORMERLY_SERIALIZED_AS];
        if (formerlySerializedAs) {
            data[formerlySerializedAs] = data[propName];
        }
    }

    if ((CCBaseNode && obj instanceof CCBaseNode) || (CCComponent && obj instanceof CCComponent)) {
        if (self._exporting) {
            var usedInPersistRoot = (obj instanceof CCBaseNode && obj._parent instanceof cc.Scene);
            if (!usedInPersistRoot) {
                return;
            }
            if (!self._dontStripDefault && !obj._id) {
                return;
            }
        }
        data._id = obj._id;
    }
}

function serializeNode (self, obj, data, fireClass) {
    if (canDiscardByPrefabRoot(self, obj)) {
        // discard props disallow to synchronize
        var isRoot = obj._prefab.root === obj;
        if (isRoot) {
            enumerateByFireClass(self, obj, data, fireClass, PRESERVE_PROPS_FOR_SYNCABLE_PREFAB_ROOT);
        }
        else {
            // should not serialize child node of syncable prefab
        }
    }
    else {
        enumerateByFireClass(self, obj, data, fireClass);
    }
}

///**
// * @param {object} obj - The object to serialize
// * @param {array|object} data - The array or dict where serialized data to store
// * @return {object} The reference info used to embed to its container.
// *                   if the serialized data not contains in serializedList, then return the data directly.
// */
function _enumerateObject (self, obj, data) {
    if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; ++i) {
            var item = _serializeField(self, obj[i]);
            if (typeof item !== 'undefined') {     // strip undefined item (dont save)
                data.push(item);
            }
        }
        return;
    }

    var klass = obj.constructor;
    if (CCNode && CCNode.isNode(obj)) {
        serializeNode(self, obj, data, klass);
        return;
    }

    var props = klass && klass.__props__;
    if (props) {
        // CCClass or fastDefine

        //if (obj.onBeforeSerialize) {
        //    obj.onBeforeSerialize();
        //}
        if (props.length > 0) {
            if (props[props.length - 1] !== '_$erialized') {
                enumerateByFireClass(self, obj, data, klass);
            }
            else if (obj._$erialized) {
                // If is missing script proxy, serialized as original data
                data.__type__ = obj._$erialized.__type__;
                _enumerateObject(self, obj._$erialized, data);
                // report warning
                if (self._missingClassReporter) {
                    self._missingClassReporter(obj, data.__type__);
                }
            }
        }
    }
    else {
        // primitive javascript object
        for (var key in obj) {
            if ( (obj.hasOwnProperty && !obj.hasOwnProperty(key)) ||
                 (key.charCodeAt(0) === 95 && key.charCodeAt(1) === 95)  // starts with __
               ) {
                continue;
            }
            // undefined value (if dont save) will be stripped from JSON
            data[key] = _serializeField(self, obj[key]);
        }
    }
}

function canDiscardByPrefabRoot (self, node) {
    var prefabInfo = node._prefab;
    return self._discardContentsForSyncablePrefab &&
           prefabInfo && prefabInfo.root && prefabInfo.root._prefab.sync;
}

///**
// * serialize any type
// * @param {*} val - The element to serialize
// */
function _serializeField (self, val) {
    var type = typeof val;
    if (type === 'object') {

        if (!val) {
            return null;
        }

        var id = val.__id__;
        if (typeof id !== 'undefined') {
            // has been serialized, no need to parse again
            return { __id__: id };
        }

        if (val instanceof CCObject) {
            if (val instanceof CCAsset) {
                var uuid = val._uuid;
                if (uuid) {
                    checkMissingAsset(self, val, uuid);
                    if (self._exporting) {
                        uuid = compressUuid(uuid, true);
                    }
                    return { __uuid__: uuid };
                }
                else {
                    // report as missing asset
                    checkMissingAsset(self, val, '');
                    return null;
                }
            }
            // validate objFlags
            var objFlags = val._objFlags;
            if (objFlags & DontSave) {
                return undefined;
            }
            if (self._exporting && (objFlags & EditorOnly)) {
                return undefined;
            }
            // validate isValid
            if (self._discardInvalid) {
                if (!val.isValid) {
                    if (self._missingObjectReporter) {
                        self._missingObjectReporter(val);
                    }
                    return null;
                }
            }
            else {
                if (!isRealValid(val)) {
                    return null;
                }
            }
            // validate prefab
            if (CCNode && CCNode.isNode(val)) {
                var willBeDiscard = canDiscardByPrefabRoot(self, val) && val !== val._prefab.root;
                if (willBeDiscard) {
                    return null;
                }
            }
        }

        return _serializeObj(self, val);
    }
    else if (type !== 'function') {
        return val;
    }
    else /*function*/ {
        return null;
    }
}

function isRealValid (object) {
    const RealDestroyed = CCObject.Flags.RealDestroyed !== undefined ? CCObject.Flags.RealDestroyed : (1 << 1);
    return !(object._objFlags & RealDestroyed);
}

///**
// * serialize only primitive object type
// * @param {object} obj - The object to serialize
// */
function _serializePrimitiveObj (self, obj) {
    var data;
    if (Array.isArray(obj)) {
        data = [];
    }
    else {  // 'object'
        data = {};
        var type = cc.js._getClassId(obj, false);
        if (type) {
            data.__type__ = type;
        }
    }

    var oldSerializedCount = self.serializedList.length;

    // mark parsing to prevent circular reference
    self._parsingObjs.push(obj);
    self._parsingData.push(data);

    _enumerateObject(self, obj, data);

    self._parsingObjs.pop();
    self._parsingData.pop();

    // check whether obj has been serialized to serializedList,
    // if it is, no need to serialized to data again
    if (self.serializedList.length > oldSerializedCount) {
        var index = self.serializedList.indexOf(data, oldSerializedCount);
        if (index !== -1) {
            return { __id__: index };
        }
    }

    // inline
    return data;
}

///**
// * serialize object
// * @param {object} obj - The object to serialize
// */
function _serializeObj (self, obj) {
    var id;
    var isFObj = obj instanceof CCObject;
    var ctor = obj.constructor;
    var type = cc.js._getClassId(obj, false);

    if (isFObj || cc.Class._isCCClass(ctor)) {
        // assign id for CCObject
        id = self.serializedList.length;
        obj.__id__ = id;        // we add this prop dynamically to simply lookup whether an obj has been serialized.
                                // If it will lead to performance degradations in V8, we just need to save ids to another table.
        self._objsToResetId.push(obj);

        // get CCObject data
        var data = {};
        self.serializedList.push(data);

        if (type) {
            data.__type__ = type;
        }
        if (! obj._serialize) {
            _enumerateObject(self, obj, data);
            if (isFObj && obj._objFlags > 0) {
                data._objFlags &= PersistentMask;
            }
        }
        else {
            //if (isFObj) {
            //    obj._objFlags &= PersistentMask;
            //}
            data.content = obj._serialize(self._exporting);
        }

        return { __id__: id };
    }
    else if (ctor && ctor !== Object && !Array.isArray(obj) && !type) {
        // unknown obj, not serializable
        return null;
    }
    else {
        if (!obj._serialize) {
            // primitive object, check circular reference
            // 对于原生javascript类型，只做循环引用的保护，
            // 并不保证同个对象的多处引用反序列化后仍然指向同一个对象。
            // 如果有此需求，应该继承自FObject
            var referencedData = _checkCircularReference(self, obj);
            if (referencedData) {
                // already referenced
                id = obj.__id__;
                return { __id__: id };
            }
            else {
                return _serializePrimitiveObj(self, obj);
            }
        }
        else {
            if (type) {
                return { content: obj._serialize(self._exporting), __type__: type };
            }
            else {
                return { content: obj._serialize(self._exporting) };
            }
        }
    }
}

///**
// * serialize main object
// * 这个方法主要是对 main object 做特殊处理，虽然和 _serializeObj 很接近，但为了
// * 避免增加 _serializeObj 的额外开销并不和它合并到一起。
// * @param {object} obj - The object to serialize
// */
function _serializeMainObj (self, obj) {
    if (obj instanceof CCObject || cc.Class._isCCClass(obj.constructor)) {
        _serializeObj(self, obj);
    }
    else if (typeof obj === 'object' && obj) {
        var data;
        if (Array.isArray(obj)) {
            data = [];
        }
        else {
            data = {};
            var type = cc.js._getClassId(obj, false);
            if (type) {
                data.__type__ = type;
            }
            if (obj._serialize) {
                data.content = obj._serialize(self._exporting);
                self.serializedList.push(data);
                return;
            }
        }

        obj.__id__ = 0;
        self._objsToResetId.push(obj);
        self.serializedList.push(data);
        _enumerateObject(self, obj, data);
    }
    else {
        self.serializedList.push(obj || null);
    }
}


/**
 * @module Editor
 */
/**
 * Serialize any object to a json string
 * @method serialize
 * @param {Asset|object} obj - The object to serialize
 * @param {object} [options=null]
 * @param {boolean} [options.exporting=false]
 * @param {boolean} [options.stringify=true] - indicates whether needs to convert the result by JSON.stringify
 * @param {boolean} [options.minify=false]
 * @param {boolean} [options.nicify=false]
 * @param {boolean} [options.discardInvalid=true]
 * @param {boolean} [options.dontStripDefault=true]
 * @param {function} [options.missingClassReporter]
 * @return {string|object} The json string to represent the object or json object if dontStringify is true
 */
function serialize (obj, options) {
    options = options || {};
    var stringify = 'stringify' in options ? options.stringify : true;
    var minify = options.minify;
    var nicify = minify || options.nicify;

    var serializer = new _Serializer(obj, options);
    var serializedList = serializer.serializedList;

    if (nicify) {
        nicifySerialized(serializedList);
    }

    var serializedData;
    if (serializedList.length === 1 && !Array.isArray(serializedList[0])) {
        serializedData = serializedList[0];
    }
    else {
        serializedData = serializedList;
    }
    if (stringify === false) {
        return serializedData;
    }
    else {
        return JSON.stringify(serializedData, null, minify ? 0 : 2);
    }
}

/**
 * Create a pseudo object which will be force serialized as a reference to any asset by specified uuid.
 * @method serialize.asAsset
 * @param {string} uuid
 * @return {Asset}
 */
serialize.asAsset = function (uuid) {
    if ( !uuid ) {
        cc.error('[Editor.serialize.asAsset] The uuid must be non-nil!');
        return null;
    }
    var pseudoAsset = new CCAsset();
    pseudoAsset._uuid = uuid;
    return pseudoAsset;
};

/**
 * Set the asset's name directly in JSON object
 * @method serialize.setName
 * @param {object} jsonObj
 * @param {string} name
 */
serialize.setName = function (jsonObj, name) {
    if ( Array.isArray(jsonObj) ) {
        jsonObj[0]._name = name;
    }
    else {
        jsonObj._name = name;
    }
};

/**
 * @method serialize.findRootObject
 * @param {object} serializedData
 * @param {string} type
 */
serialize.findRootObject = function (serializedData, type) {
    if (Array.isArray(serializedData)) {
        for (var i = 0; i < serializedData.length; i++) {
            var obj = serializedData[i];
            if (obj["__type__"] === type) {
                return obj;
            }
        }
    }
    return null;
};

//Editor.serialize.setName = function (jsonObj, name) {
//    this.getMainData(jsonObj)._name = name;
//};
//Editor.serialize.getMainData = function (jsonObj) {
//    return Array.isArray(jsonObj) ? jsonObj[0] : jsonObj;
//};

module.exports = serialize;
