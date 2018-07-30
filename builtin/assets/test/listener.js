'use strict';

/**
 * 模拟监听的 package 消息
 */
exports.package = {
    'asset-db': {
        
        'query-is-ready' (event) {
            event.reply(null, false);
        },

        'query-assets' (event) {
            event.reply(null, [
                {
                    source: 'default.asset',
                    uuid: '0',
                    import: '*',
                },
            ]);
        },

        'query-asset-info' (event) {
            event.reply(null, 
                {
                    source: 'new.asset',
                    uuid: '1',
                    import: '*',
                },
            );
        },
    },
};

/**
 * 模拟监听的 panel 消息
 */
exports.panel = {

};