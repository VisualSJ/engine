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
        name: '新建节点',
        tooltip: '如果场景内新建了节点，hierarchy 内需要查询并插入对应节点数据',
        message: 'scene:node-created',
        params: ['create-node-uuid-1'],
    },
    {
        name: '删除节点',
        tooltip: '如果场景内删除了节点，hierarchy 内需要删除对应节点数据',
        message: 'scene:node-deleted',
        params: ['delete-node-uuid-1'],
    },
    {
        name: '移动 / 重命名节点',
        tooltip: '如果场景内移动或者重命名了节点，hierarchy 内需要更新对应节点数据',
        message: 'scene:node-moved',
        params: ['move-node-uuid-1'],
    },
];