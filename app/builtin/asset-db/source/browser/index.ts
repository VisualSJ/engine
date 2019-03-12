'use strict';

import { existsSync, readFileSync } from 'fs';
import { getReady } from './state';

import {
    copyAsset, createAsset, deleteAsset, generateAvailableURL, moveAsset, saveAsset, saveAssetMeta
} from './operation';
import { debug, forwarding, init, reload } from './worker';

const worker = require('@base/electron-worker');

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

        // ------ 数据库

        /**
         * 刷新 DB
         */
        refresh() {
            reload();
        },

        /**
         * 打开调试模式
         */
        'open-devtools'() {
            debug();
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

        /**
         * 将一个 url 地址转成实际的 path 地址
         * 资源并不需要存在
         * @param url
         */
        async 'query-path-by-url'(url: string): Promise<string | null> {
            return await forwarding('asset-worker:query-path-from-url', url) || null;
        },

        /**
         * 将一个实际的 path 地址转成 url 地址
         * 资源并不需要存在
         * @param path
         */
        async 'query-url-by-path'(path: string): Promise<string | null> {
            return await forwarding('asset-worker:query-url-from-path', path) || null;
        },

        // ------ 资源查询

        /**
         * 传入资源的 url，返回 uuid
         * 资源必须存在，才会有 uuid
         * @param url
         */
        async 'query-asset-uuid'(url: string) {
            return await forwarding('asset-worker:query-uuid-from-url', url);
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
         * @param content 写入文件的 buffer 或者 string
         * @param option 创建资源的配置文件
         */
        async 'create-asset'(url: string, content: Buffer | string, option?: ICreateOption) {
            return await createAsset(url, content, option);
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
         * @param source db://assets/abc.json 或者 系统路径 如 C:\Users
         * @param target db://assets/abc
         */
        async 'copy-asset'(source: string, target: string) {
            return await copyAsset(source, target);
        },

        /**
         * 将一个资源移动到某个地方
         * @param source 需要移动的源资源
         * @param target 移动到某个路境内
         */
        async 'move-asset'(source: string, target: string) {
            return await moveAsset(source, target);
        },

        /**
         * 保存资源
         * @param uuid
         * @param content
         */
        async 'save-asset'(uuid: string, content: Buffer | string) {
            return await saveAsset(uuid, content);
        },

        /**
         * 保存资源的 meta 信息
         * @param uuid
         * @param content
         * @returns
         */
        async 'save-asset-meta'(uuid: string, content: string) {
            return await saveAssetMeta(uuid, content);
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
