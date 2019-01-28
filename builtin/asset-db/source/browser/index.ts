'use strict';

import { join } from 'path';

import { getReady } from './state';

import {
    copyAsset, createAsset, deleteAsset, generateAvailableURL, moveAsset, saveAsset, saveAssetMeta
} from './operation';
import { debug, forwarding, init, reload } from './worker';

const worker = require('@base/electron-worker');

const protocol = 'db://'; // 支持多 db , 不再列出具体的 db://assets 或 db://internal

module.exports = {
    /**
     * 监听消息
     * ${action}-${method}
     */
    messages: {

        /**
         * 资源数据库准备就绪
         * 通知同步任务 “导入资源” 开始
         */
        'asset-db:ready'() {
            Editor.Task.removeSyncTask(Editor.I18n.t('asset-db.mask.loading'));
        },

        /**
         * 资源数据库关闭
         * 通知同步任务 “导入资源” 结束
         */
        'asset-db:close'() {
            Editor.Task.addSyncTask(Editor.I18n.t('asset-db.mask.loading'));
        },

        /**
         * 打开调试模式
         */
        'open-devtools'() {
            debug();
        },

        // ------ 数据库

        /**
         * 刷新 DB
         */
        refresh() {
            reload();
        },

        /**
         * DB 是否启动完毕
         */
        async 'query-ready'() {
            return getReady();
        },

        /**
         * 查询数据库 DB 的信息
         * @param nameOrUrl 可以是 name，也可以是 url
         */
        async 'query-db-info'(nameOrUrl: string) {
            return await forwarding('asset-worker:query-db-info', nameOrUrl);
        },

        // ------- 地址转换

        async 'query-path-by-url'(url: string): Promise<string | null> {
            return await forwarding('asset-worker:query-path-from-url', url) || null;
        },

        async 'query-url-by-path'(path: string): Promise<string | null> {
            return await forwarding('asset-worker:query-url-from-path', path) || null;
        },

        // ------ 资源查询

        /**
         * 传入资源的 url，返回 uuid
         */
        async 'query-asset-uuid'(url: string) {
            return await forwarding('asset-worker:query-asset-uuid', url);
        },

        /**
         * 查询资源信息
         * @param uuid
         */
        async 'query-asset-info'(uuid: string) {
            return await forwarding('asset-worker:query-asset-info', uuid);
        },

        /**
         * 查询资源的 meta 信息
         * @param uuid
         */
        async 'query-asset-meta'(uuid: string) {
            return await forwarding('asset-worker:query-asset-meta', uuid);
        },

        /**
         * 查询资源树
         * @param options 筛选条件配置
         * @param options.type 资源类型（scripts\scene\...)
         * @param options.pattern db 路径匹配模式 (db://**)
         */
        async 'query-assets'(options: any) {
            return await forwarding('asset-worker:query-assets', options);
        },

        // ----- 资源增删改

        /**
         * 生成新文件路径
         * 根据传入 url 返回一个可用的 url 文件地址
         * @param url
         */
        async 'generate-available-url'(url: string) {
            return await generateAvailableURL(url);
        },

        /**
         * 创建一个新的资源
         * @param url db://assets/abc.json
         * @param data 写入文件的 buffer 或者 string
         */
        async 'create-asset'(url: string, data: Buffer | string) {
            return await createAsset(url, data);
        },

        /**
         * 删除某个资源
         * @param url 一个资源的 url 路径
         */
        async 'delete-asset'(url: string) {
            return await deleteAsset(url);
        },

        /**
         * 复制一个资源到指定位置
         * @param url db://assets/abc.json 或者 系统路径 如 C:\Users
         * @param to db://assets/abc
         */
        async 'copy-asset'(url: string, to: string) {
            return await copyAsset(url, to);
        },

        /**
         * 将一个资源移动到某个地方
         * @param url 需要移动的源资源
         * @param to 移动到某个路境内
         */
        async 'move-asset'(url: string, to: string) {
            return await moveAsset(url, to);
        },

        /**
         * 保存资源
         * @param {string} uuid
         * @param {(Buffer | string)} data
         */
        async 'save-asset'(uuid: string, data: Buffer | string) {
            return await saveAsset(uuid, data);
        },

        /**
         * 保存资源的 meta 信息
         * @param {string} uuid
         * @param {*} data
         * @returns
         */
        async 'save-asset-meta'(uuid: string, meta: string) {
            return await saveAssetMeta(uuid, meta);
        },

    },

    /**
     * 插件加载的时候执行的逻辑
     * 打开一个新的资源数据库
     */
    async load() {
        Editor.Task.addSyncTask(Editor.I18n.t('asset-db.mask.loading'));
        await init();
    },

    /**
     * 插件关闭的时候执行的逻辑
     * 关闭打开的 AssetDB
     */
    async unload() {
        // 关闭 worker
        worker.close('asset-db');
        Editor.Ipc.sendToAll('asset-db:close');
    },
};
