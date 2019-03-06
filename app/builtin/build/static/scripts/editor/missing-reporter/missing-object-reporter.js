var Url = require('url');
var ObjectWalker = require('./object-walker');
// var NodeUtils = Editor.require('app://editor/page/scene-utils/utils/node');

var MissingReporter = require('./missing-reporter');
var _ = require('lodash');

//function getAttr (parsingObjects, parsingKeys) {
//    var attrOwner = null;
//    var attrKey = '';
//    if (parsingObjects.length >= 1) {
//        if (cc.Class._isCCClass(parsingObjects[parsingObjects.length - 1].constructor)) {
//            attrOwner = parsingObjects[parsingObjects.length - 1];
//            attrKey = parsingKeys[parsingKeys.length - 1];
//        }
//        else if (parsingObjects.length >= 2 &&
//            cc.Class._isCCClass(parsingObjects[parsingObjects.length - 2].constructor)) {
//            attrOwner = parsingObjects[parsingObjects.length - 2];
//            attrKey = parsingKeys[parsingKeys.length - 2];
//        }
//    }
//    if (attrOwner) {
//        return { attrOwner: attrOwner, attrKey: attrKey };
//    }
//    else {
//        return null;
//    }
//}

function MissingObjectReporter(root) {
    MissingReporter.call(this, root);
}

cc.js.extend(MissingObjectReporter, MissingReporter);

MissingObjectReporter.prototype.doReport = function(obj, value, parsedObjects, rootUrl, inRootBriefLocation) {
    var parsingOwner;
    if (obj instanceof cc.Component || obj instanceof cc.Asset) {
        parsingOwner = obj;
    } else {
        parsingOwner = _.findLast(parsedObjects, (x) => (x instanceof cc.Component || x instanceof cc.Asset));
    }

    var byOwner = '';
    if (parsingOwner instanceof cc.Component) {
        var ownerType = MissingReporter.getObjectType(parsingOwner);
        byOwner = ` by ${ownerType} "${cc.js.getClassName(parsingOwner)}"`;
    } else {
        parsingOwner = _.findLast(parsedObjects, (x) => (x instanceof cc.Node));
        if (parsingOwner) {
            byOwner = ` by node "${parsingOwner.name}"`;
        }
    }

    var info;
    var valueIsUrl = typeof value === 'string';
    if (valueIsUrl) {
        info = `Asset "${value}" used${byOwner}${inRootBriefLocation} is missing.`;
    } else {
        var targetType = cc.js.getClassName(value);
        if (targetType.startsWith('cc.')) {
            targetType = targetType.slice(3);
        }
        if (value instanceof cc.Asset) {
            // missing asset
            info = `The ${targetType} used${byOwner}${inRootBriefLocation} is missing.`;
        } else {
            // missing object
            info = `The ${targetType} referenced${byOwner}${inRootBriefLocation} is invalid.`;
        }
    }

    info += MissingReporter.INFO_DETAILED;
    if (parsingOwner instanceof cc.Component) {
        parsingOwner = parsingOwner.node;
    }
    // if (parsingOwner instanceof cc.Node) {
    //     info += `Node path: "${NodeUtils.getNodePath(parsingOwner)}"\n`;
    // }
    if (rootUrl) {
        info += `Asset url: "${rootUrl}"\n`;
    }
    if (value instanceof cc.Asset && value._uuid) {
        info += `Missing uuid: "${value._uuid}"\n`;
    }
    info.slice(0, -1);  // remove last '\n'
    Editor.warn(info);
};

MissingObjectReporter.prototype.report = function() {
    var rootUrl;
    if (this.root instanceof cc.Asset) {
        rootUrl = Editor.assetdb.remote.uuidToUrl(this.root._uuid);
    }
    var rootType = MissingReporter.getObjectType(this.root);
    var inRootBriefLocation = rootUrl ? ` in ${rootType} "${Url.basename(rootUrl)}"` : '';

    ObjectWalker.walk(this.root, (obj, key, value, parsedObjects, parsedKeys) => {
        if (this.missingObjects.has(value)) {
            this.doReport(obj, value, parsedObjects, rootUrl, inRootBriefLocation);
        }
    });
};

MissingObjectReporter.prototype.reportByOwner = function() {
    var rootUrl;
    if (this.root instanceof cc.Asset) {
        rootUrl = Editor.assetdb.remote.uuidToUrl(this.root._uuid);
    }
    var rootType = MissingReporter.getObjectType(this.root);
    var inRootBriefLocation = rootUrl ? ` in ${rootType} "${Url.basename(rootUrl)}"` : '';

    ObjectWalker.walkProperties(this.root, (obj, key, actualValue, parsedObjects) => {
        var props = this.missingOwners.get(obj);
        if (props && (key in props)) {
            var reportValue = props[key];
            this.doReport(obj, reportValue || actualValue, parsedObjects, rootUrl, inRootBriefLocation);
        }
    }, {
            dontSkipNull: true,
        });
};

module.exports = MissingObjectReporter;
