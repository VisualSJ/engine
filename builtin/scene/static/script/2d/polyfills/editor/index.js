window.CC_EDITOR = true;

window.Editor = window.Editor ? Editor : {
    // 适配 Editor.require()
    require (url) {
        switch (url) {
            case 'app://editor/page/scene-utils/missing-class-reporter':
                return require('./missing-reporter/missing-class-reporter');
            case 'app://editor/page/scene-utils/utils/node':
                return {};
            case 'scene://edit-mode':
                return { curMode () { return {}; } };
            case 'scene://utils/animation':
                return { Cache: {} };
            case 'unpack://engine-dev/cocos2d/core/event/event-target':
                return {};
            case 'unpack://engine-dev/cocos2d/core/platform/CCObject':
                return {};
            case 'unpack://engine-dev/cocos2d/core/platform/utils':
                return {};
            default:
                return require(url);
        }
    },

    // 适配 Editor.Utils.UuidUtils.uuid()
    Utils: {
        UuidUtils: require('../../../../../../engine/static/utils/2d/serialize/uuid'),
    },
};