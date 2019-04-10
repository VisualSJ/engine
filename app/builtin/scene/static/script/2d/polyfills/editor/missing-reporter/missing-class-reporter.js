var _ = require('lodash');
var ps = require('path');
var ObjectWalker = require('./object-walker');
// var NodeUtils = Editor.require('app://editor/page/scene-utils/utils/node');
var getClassById = cc.js._getClassById;

var MissingReporter = require('./missing-reporter');

function report(parsingOwner, classId, asset, url) {
    var assetType = MissingReporter.getObjectType(asset);
    var assetName = url && ps.basename(url);

    if (asset instanceof cc.SceneAsset || asset instanceof cc.Prefab) {
        var info;
        var component;
        var node;
        if (parsingOwner instanceof cc.Component) {
            component = parsingOwner;
            node = component.node;
        } else if (cc.Node.isNode(parsingOwner)) {
            node = parsingOwner;
        }

        var IN_LOCATION = assetName ? ` in ${assetType} "${assetName}"` : '';
        var detailedClassId = classId;
        var isScript = false;

        if (component) {
            var compName = cc.js.getClassName(component);
            // missing property type
            if (component instanceof cc._MissingScript) {
                isScript = true;
                detailedClassId = compName = component._$erialized.__type__;
            }
            info = `Class "${classId}" used by component "${compName}"${IN_LOCATION} is missing or invalid.`;
        } else if (node) {
            // missing component
            isScript = true;
            info = `Script attached to "${node.name}"${IN_LOCATION} is missing or invalid.`;
        } else {
            return;
        }

        info += MissingReporter.INFO_DETAILED;
        // info += `Node path: "${NodeUtils.getNodePath(node)}"\n`;
        if (url) {
            info += `Asset url: "${url}"\n`;
        }
        if (isScript && Editor.Utils.UuidUtils.isUuid(detailedClassId)) {
            info += `Script UUID: "${Editor.Utils.UuidUtils.decompressUuid(detailedClassId)}"\n`;
            info += `Class ID: "${detailedClassId}"\n`;
        }
        info.slice(0, -1);  // remove last '\n'
        console.warn(info);
    } else {
        // missing CustomAsset ? not yet implemented
    }
}

function reportByWalker(value, obj, parsedObjects, asset, url, classId) {
    classId = classId || (value._$erialized && value._$erialized.__type__);
    var parsingOwner;
    if (obj instanceof cc.Component || cc.Node.isNode(obj)) {
        parsingOwner = obj;
    } else {
        parsingOwner = _.findLast(parsedObjects, (x) => (x instanceof cc.Component || cc.Node.isNode(x)));
    }
    report(parsingOwner, classId, asset, url);
}

// MISSING CLASS REPORTER

function MissingClassReporter(root) {
    MissingReporter.call(this, root);
}

cc.js.extend(MissingClassReporter, MissingReporter);

MissingClassReporter.prototype.report = function() {
    ObjectWalker.walk(this.root, (obj, key, value, parsedObjects) => {
        if (this.missingObjects.has(value)) {
            reportByWalker(value, obj, parsedObjects, this.root);
        }
    });
};

MissingClassReporter.prototype.reportByOwner = function() {
    var rootUrl;
    if (this.root instanceof cc.Asset) {
        rootUrl = Editor.assetdb.remote.uuidToUrl(this.root._uuid);
    }

    ObjectWalker.walkProperties(this.root, (obj, key, value, parsedObjects) => {
        var props = this.missingOwners.get(obj);
        if (props && (key in props)) {
            var typeId = props[key];
            reportByWalker(value, obj, parsedObjects, this.root, rootUrl, typeId);
        }
    }, {
        dontSkipNull: true
    });
};

// 用这个模块来标记找不到脚本的对象
var MissingClass = {
    reporter: new MissingClassReporter(),
    classFinder: function(id, data, owner, propName) {
        var cls = getClassById(id);
        if (cls) {
            return cls;
        } else if (id) {
            MissingClass.hasMissingClass = true;
            MissingClass.reporter.stashByOwner(owner, propName, id);
        }
        return null;
    },
    hasMissingClass: false,
    reportMissingClass: function(asset) {
        MissingClass.reporter.root = asset;
        MissingClass.reporter.reportByOwner();
        MissingClass.reporter.reset();
    }
};

MissingClass.classFinder.onDereferenced = function(curOwner, curPropName, newOwner, newPropName) {
    var id = MissingClass.reporter.removeStashedByOwner(curOwner, curPropName);
    if (id) {
        MissingClass.reporter.stashByOwner(newOwner, newPropName, id);
    }
};

module.exports = { MissingClass, MissingClassReporter };
