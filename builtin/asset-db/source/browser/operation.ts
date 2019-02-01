'use strict';

import { copy, ensureDir, existsSync, move, outputFile, remove, rename } from 'fs-extra';
import { dirname, extname, join } from 'path';

import { getName } from './utils';
import { awaitAsset, forwarding } from './worker';

/**
 * 生成可用的 url
 * 如果 url 文件存在，则会增加一个后缀以示区分
 * @param url
 */
export async function generateAvailableURL(url: string): Promise<string | null> {
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
export async function createAsset(url: string, content: Buffer | string | null, option?: ICreateOption): Promise<string | null> {
    if (!url.startsWith('db://')) {
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

    if (content !== null) { // content 存在，则写入成文件
        await outputFile(file, content);
    } else if (!option) { // content 不存在，且 option 不存在，则生成文件夹
        await ensureDir(file);
    } else if (option.src) { // 如果 content 不存在，且 option.target 存在，则复制 target
        if (!existsSync(option.src)) {
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
 * @param data
 */
export async function saveAsset(uuid: string, data: Buffer | string): Promise<boolean> {
    if (!uuid) {
        console.warn(`${Editor.I18n.t('asset-db.saveAsset.fail.uuid')} \n${uuid}`);
        return false;
    }
    data = data || '';
    const info: IAssetInfo = await forwarding('asset-worker:query-asset-info', uuid);
    if (!info) {
        console.warn(`${Editor.I18n.t('asset-db.saveAsset.fail.uuid')} \n${uuid}`);
        return false;
    }

    try {
        await outputFile(info.file, data);
    } catch (error) {
        console.warn(`${Editor.I18n.t('asset-db.saveAsset.fail.unknown')}`);
        console.warn(error);
        return false;
    }
    await awaitAsset('change', info.file);
    return true;
}

/**
 * 保存资源 meta 信息
 * @param uuid
 * @param meta
 */
export async function saveAssetMeta(uuid: string, meta: string) {
    // TODO 根据 meta 对象生成默认的一些 meta 数据
    try {
        const isSaved = await forwarding('asset-worker:save-asset-meta', uuid, meta);
        console.info('asset meta saved');
        return isSaved;
    } catch (err) {
        console.warn(`${Editor.I18n.t('asset-db.saveAssetMeta.fail.unknown')}`);
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
    if (!source || !source.startsWith('db://')) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.url')} \nsource: ${source}`);
        return false;
    }

    if (!target || !target.startsWith('db://')) {
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

    // 目标文件已经存在
    if (existsSync(assets.target)) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.target')} \ntarget: ${assets.target}`);
        return false;
    }

    // 如果源地址不能被目标地址包含
    if (target.startsWith(join(assets.source, '/'))) {
        console.warn(`${Editor.I18n.t('asset-db.copyAsset.fail.parent')} \nsource: ${source}\ntarget: ${target}`);
        return false;
    }

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
    if (!source || !target) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.url')} \nsource: ${source}\ntarget: ${target}`);
        return false;
    }

    const assets = {
        // 被移动的资源信息
        source: await forwarding('asset-worker:query-path-from-url', source),
        // 移动到这个资源内
        target: await forwarding('asset-worker:query-path-from-url', target),
    };

    // 如果源地址，目标地址相同
    if (assets.source === assets.target) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.same')} \nsource: ${source}\ntarget: ${target}`);
        return false;
    }

    // 源地址不存在文件
    if (!assets.source || !existsSync(assets.source)) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.source')} \nsource: ${source}`);
        return false;
    }

    // 目标地址找不到
    if (!assets.target) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.target')} \ntarget: ${target}`);
        return false;
    }

    // 如果目标已经存在
    if (existsSync(assets.target)) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.exist')} \ntarget: ${target}`);
        return false;
    }

    const metas = {
        source: assets.source + '.meta',
        target: assets.target + '.meta',
    };

    if (existsSync(metas.target)) {
        await remove(metas.target);
    }

    const DBInfo: IDatabaseInfo = await forwarding('asset-worker:query-db-info', source);

    try {
        await forwarding('asset-worker:pause-database', DBInfo.name);
        if (dirname(assets.source) === dirname(assets.target)) {
            await rename(metas.source, metas.target);
            await rename(assets.source, assets.target);
        } else {
            await move(metas.source, metas.target);
            await move(assets.source, assets.target);
        }
    } catch (error) {
        console.warn(`${Editor.I18n.t('asset-db.moveAsset.fail.url')}`);
        console.warn(error);
        forwarding('asset-worker:resume-database', DBInfo.name);
        return false;
    }

    forwarding('asset-worker:resume-database', DBInfo.name);

    await awaitAsset('add', metas.target);

    return true;
}

/**
 * 删除资源
 * @param source
 */
export async function deleteAsset(source: string): Promise<boolean> {
    if (!source) {
        console.warn(`${Editor.I18n.t('asset-db.deleteAsset.fail.url')} \nsource: ${source}`);
        return false;
    }

    const file = await forwarding('asset-worker:query-path-from-url', source);

    // 如果不存在，停止操作
    if (!file || !existsSync(file)) {
        console.warn(`${Editor.I18n.t('asset-db.deleteAsset.fail.unexist')} \nsource: ${source}`);
        return false;
    }

    const DBInfo: IDatabaseInfo = await forwarding('asset-worker:query-db-info', source);

    try {
        // await forwarding('asset-worker:pause-database', DBInfo.name);
        await remove(file);
        await remove(file + '.meta');
    } catch (error) {
        console.warn(`${Editor.I18n.t('asset-db.deleteAsset.fail.unknown')}`);
        console.warn(error);
        // forwarding('asset-worker:resume-database', DBInfo.name);
        return false;
    }

    // forwarding('asset-worker:resume-database', DBInfo.name);

    await awaitAsset('delete', file);

    return true;
}
