'use strict';

/**
 * 模拟发送的 package 消息
 */
exports.package = [
    {
        name: '选择节点',
        tooltip: '选择节点后，会广播消息通知所有插件',
        message: 'select',
        params: ['node', 'node-uuid-1'],
    }, {
        name: '反选节点',
        tooltip: '取消选中的节点后，会广播消息通知所有插件',
        message: 'unselect',
        params: ['node', 'node-uuid-1'],
    }, {
        name: '清空选中的节点',
        tooltip: '如果选中节点，会广播取消选中的消息',
        message: 'clear',
        params: ['node'],
    }, {
        name: '查询最后选中的节点',
        tooltip: '返回最后选中的节点的 uuid',
        message: 'query-last-select',
        params: ['node'],
        reply: true,
    }, {
        name: '选择资源',
        tooltip: '选择资源后，会广播消息通知所有插件',
        message: 'select',
        params: ['asset', 'asset-uuid-1'],
    }, {
        name: '反选资源',
        tooltip: '取消选中的资源后，会广播消息通知所有插件',
        message: 'unselect',
        params: ['asset', 'asset-uuid-1'],
    }, {
        name: '清空选中的资源',
        tooltip: '如果选中资源，会广播取消选中的消息',
        message: 'clear',
        params: ['asset'],
    }, {
        name: '查询最后选中的资源',
        tooltip: '返回最后选中的资源的 uuid',
        message: 'query-last-select',
        params: ['asset'],
        reply: true,
    }, {
        name: '查询最后选中的物体类型',
        tooltip: '返回选中的类型',
        message: 'query-last-select-type',
        params: [],
        reply: true,
    },
];

/**
 * 模拟发送 panel 消息
 */
exports.panel = [];