'use strict';

/**
 * 模拟监听的 package 消息
 */
exports.package = {
    'scene': {

        'query-is-ready' (event) {
            event.reply(null, false);
        },

        'query-node-tree' (event) {
            event.reply(null, [
                {
                    name: 'Canvas',
                    children: [
                        {
                            name: 'Child 1',
                        }, {
                            name: 'Child 2',
                        },
                    ],
                }, {
                    name: 'Node 1',
                }, {
                    name: 'Node 2',
                },
            ]);
        },
    },
};

/**
 * 模拟监听的 panel 消息
 */
exports.panel = {};