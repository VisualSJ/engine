
function MissingReporter(root) {
    // 这个属性用于 stash 和 report
    this.missingObjects = new Set();
    // 这个属性用于 stashByOwner 和 reportByOwner
    this.missingOwners = new Map();

    this.root = root;
}

MissingReporter.prototype.reset = function() {
    this.missingObjects.clear();
    this.missingOwners.clear();
    this.root = null;
};

MissingReporter.prototype.stash = function(obj) {
    this.missingObjects.add(obj);
};

/**
 * stashByOwner 和 stash 的区别在于，stash 要求对象中有值，stashByOwner 允许对象的值为空
 * @param {any} [value] - 如果 value 未设置，不会影响提示信息，只不过提示信息可能会不够详细
 */
MissingReporter.prototype.stashByOwner = function(owner, propName, value) {
    var props = this.missingOwners.get(owner);
    if (!props) {
        props = {};
        this.missingOwners.set(owner, props);
    }
    props[propName] = value;
};

MissingReporter.prototype.removeStashedByOwner = function(owner, propName) {
    var props = this.missingOwners.get(owner);
    if (props) {
        if (propName in props) {
            var id = props[propName];
            delete props[propName];

            if (Object.keys(props).length) {
                return id;
            }

            // for (var k in props) {
            //     // still has props
            //     return id;
            // }
            // empty
            this.missingOwners.delete(owner);
            return id;
        }
    }
    return undefined;
};

MissingReporter.prototype.report = null;
MissingReporter.prototype.reportByOwner = null;

MissingReporter.getObjectType = function(obj) {
    if (obj instanceof cc.Component) {
        return 'component';
    } else if (obj instanceof cc.Prefab) {
        return 'prefab';
    } else if (obj instanceof cc.SceneAsset) {
        return 'scene';
    } else {
        return 'asset';
    }
};

MissingReporter.INFO_DETAILED = ' Detailed information:\n';

module.exports = MissingReporter;
