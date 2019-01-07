'use strict';
const { readTemplate } = require('../../../../utils');
const { assetComponentPrefix } = require('../../asset-section');

exports.template = readTemplate('3d', './asset-section/assets/texture.html');

exports.props = ['info', 'meta'];

exports.components = {
    [`${assetComponentPrefix}image-preview`]: require('../public/image-preview'),
};

exports.data = function() {
    return {
        imgSrc: '',
    };
};

exports.watch = {
    'meta.uuid': 'getImagePath',
};

exports.mounted = function() {
    this.getImagePath();
};

async function getImageLikeAssetSource(meta) {
    switch (meta.importer) {
        case 'image':
        case 'gltf-embeded-image':
            return getLibrariedSource(meta);

        case 'texture': {
            const userData = meta.userData;
            let imageUuid = userData.imageUuidOrDatabaseUri;
            if (!imageUuid) {
                return '';
            }
            if (!userData.isUuid) {
                return await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', imageUuid);
            }
            if (!imageUuid) {
                return '';
            }

            const imageMeta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', imageUuid);
            return getImageLikeAssetSource(imageMeta);
        }
        default:
            return '';
    }
}

async function getLibrariedSource(meta) {
    const { library } = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', meta.uuid);

    const key = Object.keys(library).find((key) => key !== '.json');
    if (!key) {
        return '';
    }
    return library[key];
}

exports.methods = {
    /**
     * 重置
     */
    reset() {
        this.$parent.$emit('reset');
    },

    /**
     * 应用
     */
    apply() {
        this.$parent.$emit('apply');
    },

    async getImagePath() {
        try {
            const { meta } = this;
            this.imgSrc = await getImageLikeAssetSource(meta);
        } catch (err) {
            console.error(err);
            this.imgSrc = '';
        }
    },
};
