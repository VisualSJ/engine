/**
 * BuildResults (assets, dependencies).
 * BuildResults also provides several functions to collect detailed asset informations.
 */
class BuildResults {
    constructor() {
        this._buildAssets = null;
        this._packedAssets = null;
        this.settings = null;
        this.paths = null;
        this.options = null;
    }

    /**
     * Returns true if the asset contains in the build.
     *
     * @param {boolean} [assertContains=false]
     * @returns {boolean}
     */
    containsAsset(uuid, assertContains) {
        var res = uuid in this._buildAssets;
        if (!res && assertContains) {
            Editor.error(`The bulid not contains an asset with the given uuid "${uuid}".`);
        }
        return res;
    }

    /**
     * Returns the uuids of all assets included in the build.
     *
     * @returns {string[]}
     */
    getAssetUuids() {
        return Object.keys(this._buildAssets);
    }

    /**
     * Return the uuids of assets which are dependencies of the input, also include all indirect dependencies.
     * The list returned will not include the input uuid itself.
     *
     * @param {string} uuid
     * @returns {string[]}
     */
    getDependencies(uuid) {
        if (!this.containsAsset(uuid, true)) {
            return [];
        }
        return Editor.Utils.getDependsRecursively(this._buildAssets, uuid, 'dependUuids');
    }

    /**
     * Get type of asset defined in the engine.
     * You can get the constructor of an asset by using `cc.js.getClassByName(type)`.
     *
     * @param {string} uuid
     * @returns {string}
     */
    getAssetType(uuid) {
        this.containsAsset(uuid, true);
        return getAssetType(uuid);
    }

    /**
     * Get the path of the specified native asset such as texture.
     * Returns empty string if not found.
     *
     * @param {string} uuid
     * @returns {string}
     */
    getNativeAssetPath(uuid) {
        if (!this.containsAsset(uuid, true)) {
            return '';
        }
        var result = this._buildAssets[uuid];
        if (typeof result === 'object') {
            return result.nativePath || '';
        }
        return '';
    }
}

module.exports = BuildResults;

function getAssetType(uuid) {
    var assetInfo = Editor.assetdb.assetInfoByUuid(uuid);
    if (assetInfo) {
        var type = assetInfo.type;
        var ctor = Editor.assets[type];
        if (ctor) {
            return cc.js._getClassId(ctor, false);
        } else {
            Editor.error('Can not get asset type of ' + uuid);
        }
    } else {
        // assets generated dynamically, only auto atlas until now
        return cc.js._getClassId(cc.Texture2D, false);
    }
    return cc.js._getClassId(cc.RawAsset, false);
}
