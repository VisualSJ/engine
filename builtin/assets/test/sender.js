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
        name: 'DB 就绪',
        tooltip: '数据库就绪的时候，应该去除 loading 状态，并查询现在的资源树',
        message: 'asset-db:ready',
        params: [],
    },
    {
        name: 'DB 关闭',
        tooltip: '数据库关闭，应该开始 loading 状态，并清空资源树',
        message: 'asset-db:close',
        params: [],
    },
    {
        name: '新增文件',
        tooltip: '初始化后，应该添加文件到显示队列，未初始化则忽略',
        message: 'asset-db:asset-add',
        params: ['1'],
    },
    {
        name: '删除文件',
        tooltip: '初始化后，应该将文件从显示队列删除，未初始化则忽略',
        message: 'asset-db:asset-delete',
        params: ['1'],
    },
];