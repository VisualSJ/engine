'use strict';

function getCtor(importer) {

    switch (importer) {
        case 'scene':
            return cc.Scene;
        case 'texture':
            return cc.Texture;
        case 'sprite-frame':
            return cc.SpriteFrame;
    }
}

module.exports = {
    getCtor,
};