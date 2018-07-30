'use strict';

/**
 * 模拟发送的 package 消息
 */
exports.package = [];

/**
 * 模拟发送 panel 消息
 */
exports.panel = [
    {
        name: '场景就绪',
        tooltip: '场景就绪的时候，应该去除 loading 状态，并查询现在的节点树',
        message: 'scene:ready',
        params: [],
    },
    {
        name: '场景关闭',
        tooltip: '场景就绪的时候，应该还原 loading 状态，并清空节点树',
        message: 'scene:close',
        params: [],
    },
    {
        name: '资源就绪',
        tooltip: '场景就绪的时候，应该去除 loading 状态，并查询现在的节点树',
        message: 'asset-db:ready',
        params: [],
    },
    {
        name: '资源关闭',
        tooltip: '场景就绪的时候，应该还原 loading 状态，并清空节点树',
        message: 'asset-db:close',
        params: [],
    },
];