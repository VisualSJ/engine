'use strict';

const assets = require('../../assets');

window.Editor = window.Editor ? Editor : {
    // 适配 Editor.require()
    require(url) {
        switch (url) {
            case 'app://editor/page/scene-utils/missing-class-reporter':
                return require('./missing-reporter/missing-class-reporter');
            case 'app://editor/page/scene-utils/utils/node':
                return {};
            case 'scene://edit-mode':
                return { curMode() { return {}; } };
            case 'scene://utils/animation':
                return { Cache: {} };
            case 'unpack://engine-dev/cocos2d/core/event/event-target':
                return {};
            case 'unpack://engine-dev/cocos2d/core/platform/CCObject':
                return {};
            case 'unpack://engine-dev/cocos2d/core/platform/utils':
                return {};
            case 'scene://utils/prefab':
                return {
                    linkPrefab() {},
                    unlinkPrefab() {},
                };
            case 'packages://scene/panel/tools/camera':
                return require('../../manager/camera');
            case 'scene://utils/node':
                return require('../../manager/node');
            default:
                return require(url);
        }
    },

    // 适配 Editor.Utils.UuidUtils.uuid()
    Utils: {
        UuidUtils: require('../../../../../../engine/static/utils/2d/serialize/uuid'),
        UuidCache: {
            cache() {},
        },
    },

    assetdb: {
        remote: {
            uuidToUrl() {

            },
        }
    },

    Selection: {
        curActivate() {
            return '';
        },
    },

    log(...args) {
        console.log(...args);
    },

    warn(...args) {
        console.warn(...args);
    },

    error(...args) {
        console.error(...args);
    },

    assets: assets.assetMap,

    Ipc: {
        async sendToMain(message, ...args) {

            switch (message) {
                case 'scene:query-asset-info-by-uuid':
                    const uuid = args[0];
                    const callback = args[1];

                    const info = await Manager.Ipc.send('query-asset-info', uuid);

                    let url = info.files[0]
                        .replace(/^\S+(\/|\\)library(\/|\\)/, '')
                        .replace(/\.\S+$/, '.json');

                    callback && callback(null, {
                        url: `import://${url}`,
                        type: info.importer,
                    });

                    // callback && callback(null, `import://${url}`, false, assets.getCtor(info.importer));
                    break;

                default:
            }
        },
    }
};
