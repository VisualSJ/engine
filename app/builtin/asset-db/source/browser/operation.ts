'use strict';

import { copy, ensureDir, existsSync, outputFile } from 'fs-extra';
import { dirname, extname, join } from 'path';

import { getName, moveFile, removeFile } from './utils';
import { awaitAsset, forwarding } from './worker';

/**
 * 生成可用的 url
 * 如果 url 文件存在，则会增加一个后缀以示区分
 * @param url
 */
export async function generateAvailableURL(url: string): Promise<string | null> {
    if (!url || typeof url !== 'string') {
        return null;
    }

    let file: string = await forwarding('asset-worker:query-path-from-url', url);

    if (!file) {
        return null;
    }

    file = getName(file);

    return await forwarding('asset-worker:query-url-from-path', file) || null;
}

/**
 * 创建资源
 * @param url
 * @param content
 */
// tslint:disable-next-line:max-line-length
export async function createAsset(url: string, content?: Buffer | string | null, option?: ICreateOption): Promise<string | null> {
    if (!url || typeof url !== 'string' || !url.startsWith('db://')) {
        console.warn(`${Editor.I18n.t('asset-db.createAsset.fail.url')} \n${url}`);
        return null;
    }

    // 文件目录路径
    let file;

    try {
        file = await forwarding('asset-worker:query-path-from-url', url);
    } catch (error) { }

    if (!file) {
        console.warn(`${Editor.I18n.t('asset-db.createAsset.fail.url')} \n${url}`);
        return null;
    }

    if (existsSync(file)) {
        console.warn(`${Editor.I18n.t('asset-db.createAsset.fail.exist')} \n${url}`);
        return null;
    }

    if (content !== undefined && content !== null) { // content 存在
        if (content instanceof Buffer || typeof content === 'string') { // 格式正确，写入成文件
            await outputFile(file, content);
        } else {
            console.warn(`${Editor.I18n.t('asset-db.createAsset.fail.content')}`); // 格式不正确，报错
            return null;
        }
    } else { // content 不存在
        if (option === undefined || option === null) { // option 不存在，则生成文件夹
            await ensureDir(file);
        } else {
            if (option.src) { // 如果 option.src 存在，则复制这一指定资源
                if (typeof option.src !== 'string' || !url.startsWith('db://') || !existsSync(option.src)) {
                    console.warn(`${Editor.I18n.t('asset-db.createAsset.fail.drop')} \n${option.src}`);
                    return null;
                }

                try {
                    await copy(option.src, file, {
                        overwrite: true,
                        filter(a, b) {
                            return extname(a) !== '.meta';
                        },
                    });
                } catch (error) {
                    console.warn(`${Editor.I18n.t('asset-db.createAsset.fail.unknown')}`);
                    console.warn(error);
                    return null;
                }
            }
        }
    }

    if (!existsSync(file)) { // node 没有创建文件
        console.warn(`${Editor.I18n.t('asset-db.createAsset.fail.drop')} \n${file}`);
        return null;
    }

    // 等待 db 发出 add 消息
    await awaitAsset('add', file);

    let newURL;

    try {
        newURL = await forwarding('asset-worker:query-url-from-path', file);
    } catch (error) { }

    if (!newURL) {
        console.warn(`${Editor.I18n.t('asset-db.createAsset.fail.toUrl')} \n${file}`);
        return null;
    }

    let uuid;

    try {
        uuid = await forwarding('asset-worker:query-uuid-from-url', newURL || '');
    } catch (error) { }

    if (!uuid) {
        console.warn(`${Editor.I18n.t('asset-db.createAsset.fail.uuid')} \n${newURL}`);
        return null;
    }

    return uuid;
}

/**
 * 保存资源
 * @param uuid
 * @param content
 */
export async function saveAsset(uuid: string, content: Buffer | string): Promise<boolean> {
    if (!uuid || typeof uuid !== 'string') {
        console.warn(`${Editor.I18n.t('asset-db.saveAsset.fail.uuid')} \n${uuid}`);
        return false;
    }

    const info: IAssetInfo = await forwarding('asset-worker:query-asset-info', uuid);
    if (!info) {
        console.warn(`${Editor.I18n.t('asset-db.saveAsset.fail.uuid')} \n${uuid}`);
        return false;
    }

    if (content instanceof Buffer || typeof content === 'string') { // 格式正确，写入成文件
        try {
            await outputFile(info.file, content);
            console.info('asset saved');
        } catch (error) {
            console.warn(error);
            return false;
        }
    } else {
        console.warn(`${Editor.I18n.t('asset-db.saveAsset.fail.content')}`); // 格式不正确，报错
        return false;
    }

    await awaitAsset('change', info.file);
    return true;
}

/**
 * 保存资源 meta 信息
 * @param uuid
 * @param content
 */
export async function saveAssetMeta(uuid: string, content: string) {
    if (!uuid || typeof uuid !== 'string') {
        console.warn(`${Editor.I18n.t('asset-db.saveAssetMeta.fail.uuid')} \n${uuid}`);
        return false;
    }

    if (typeof content !== 'string') {
        console.warn(`${Editor.I18n.t('asset-db.saveAssetMeta.fail.content')}`);
        return false;
    }

    try {
        const isSaved = await forwarding('asset-worker:save-asset-meta', uuid, content);
        if (!isSaved) {
            console.warn(`${Editor.I18n.t('asset-db.saveAssetMeta.fail.content')}`);
            return false;
        }

        console.info('asset meta saved');
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

/**
 * 复制资源
 * @param source 需要被复制的源文件地址 db://assets/a.txt
 * @param target 复制到的位置 db://assets/b/a.txt
 */
export async function copyAsset(source: string, target: string): Promise<boolean> {
    if (!source || typeof source !== 'string' || !source.startsWith('db://')) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.url')} \nsource: ${source}`);
        return false;
    }

    if (!target || typeof target !== 'string' || !target.startsWith('db://')) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.url')} \ntarget: ${target}`);
        return false;
    }

    const assets = {
        source: await forwarding('asset-worker:query-path-from-url', source),
        target: await forwarding('asset-worker:query-path-from-url', target),
    };

    // 源文件不存在
    if (!assets.source || !existsSync(assets.source)) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.source')} \nsource: ${assets.source}`);
        return false;
    }

    // 目标地址错误 或 文件已经存在
    if (!assets.target || existsSync(assets.target)) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.target')} \ntarget: ${assets.target}`);
        return false;
    }

    // 源地址不能被目标地址包含
    if (assets.target.startsWith(join(assets.source, '/'))) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.include')} \nsource: ${source}\ntarget: ${target}`);
        return false;
    }

    // 目标地址的父级文件夹处于 readOnly 状态
    const targetParentUrl = dirname(target);
    const targetParentUuid = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-uuid', targetParentUrl);
    if (!targetParentUuid) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.parent')} \ntarget: ${assets.target}`);
        return false;
    }
    const targetParentInfo = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', targetParentUuid);
    if (!targetParentInfo) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.parent')} \ntarget: ${assets.target}`);
        return false;
    }
    if (targetParentInfo.readOnly) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.readonly')} \ntarget: ${assets.target}`);
        return false;
    }

    // 可以进行复制了
    try {
        await copy(assets.source, assets.target);
    } catch (error) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.unknown')}`);
        console.warn(error);
        return false;
    }

    await awaitAsset('add', assets.target);

    return true;
}

/**
 * 移动资源
 * @param source 源文件的 url db://assets/abc.txt
 * @param target 目标 url db://assets/a.txt
 */
export async function moveAsset(source: string, target: string): Promise<boolean> {
    if (!source || typeof source !== 'string' || !source.startsWith('db://')) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.url')} \nsource: ${source}`);
        return false;
    }

    if (!target || typeof target !== 'string' || !target.startsWith('db://')) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.url')} \ntarget: ${target}`);
        return false;
    }

    const assets = {
        // 被移动的资源信息
        source: await forwarding('asset-worker:query-path-from-url', source),
        // 移动到这个资源内
        target: await forwarding('asset-worker:query-path-from-url', target),
    };

    // 源地址错误 或 源地址不存在文件
    if (!assets.source || !existsSync(assets.source)) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.source')} \nsource: ${source}`);
        return false;
    }

    // 目标地址错误 或 目标已经存在
    if (!assets.target || existsSync(assets.target)) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.target')} \ntarget: ${target}`);
        return false;
    }

    // 源地址不能被目标地址包含
    if (assets.target.startsWith(join(assets.source, '/'))) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.parent')} \nsource: ${source}\ntarget: ${target}`);
        return false;
    }

    // 目标地址的父级文件夹处于 readOnly 状态
    const targetParentUrl = dirname(target);
    const targetParentUuid = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-uuid', targetParentUrl);
    if (!targetParentUuid) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.parent')} \ntarget: ${assets.target}`);
        return false;
    }
    const targetParentInfo = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', targetParentUuid);
    if (!targetParentInfo) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.parent')} \ntarget: ${assets.target}`);
        return false;
    }
    if (targetParentInfo.readOnly) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.readonly')} \ntarget: ${assets.target}`);
        return false;
    }

    //
    try {
        await moveFile(assets.source, assets.target);
    } catch (error) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.url')}`);
        console.warn(error);
        return false;
    }

    await awaitAsset('change', assets.target);

    return true;
}

/**
 * 删除资源
 * @param url
 */
export async function deleteAsset(url: string): Promise<boolean> {
    if (!url || typeof url !== 'string' || !url.startsWith('db://')) {
        console.warn(`${Editor.I18n.t('asset-db.deleteAsset.fail.url')} \nurl: ${url}`);
        return false;
    }

    const file = await forwarding('asset-worker:query-path-from-url', url);

    // 如果不存在，停止操作
    if (!file || !existsSync(file)) {
        console.warn(`${Editor.I18n.t('asset-db.deleteAsset.fail.unexist')} \nurl: ${url}`);
        return false;
    }

    try {
        await removeFile(file);
        await removeFile(file + '.meta');
    } catch (error) {
        console.warn(`${Editor.I18n.t('asset-db.deleteAsset.fail.unknown')}`);
        console.warn(error);
        return false;
    }

    await awaitAsset('delete', file);

    return true;
}
