'use strict';

const assetMap = {
    get scene() {
        return cc.SceneAsset;
    },

    get texture() {
        return cc.Texture2D;
    },

    get 'sprite-frame'() {
        return cc.SpriteFrame;
    },
};

function getCtor(importer) {

    switch (importer) {
        case 'scene':
            return cc.Scene;
        case 'texture':
            return cc.Texture;
        case 'sprite-frame':
            return cc.SpriteFrame;
        case 'tiled-map':
            return cc.TiledMap;
        case 'material':
            return cc.Material;
    }
}

module.exports = {
    getCtor,
    assetMap,
};
