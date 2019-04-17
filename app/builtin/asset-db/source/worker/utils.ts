'use strict';

import { Asset, AssetDB, VirtualAsset } from '@editor/asset-db';
import { basename, relative, resolve } from 'path';

/**
 * 将一个绝对路径，转成 url 地址
 * @param path
 * @param name
 */
export function path2url(path: string, name: string) {
    // 否则会出现返回 'db://internal/../../../../../db:/internal' 的情况
    if (path === `db://${name}`) {
        return path;
    }

    const database = Manager.AssetWorker[name];

    // 将 windows 上的 \ 转成 /，统一成 url 格式
    let _path = relative(database.options.target, path);
    _path = _path.replace(/\\/g, '/');

    return `db://${name}/${_path}`;
}

/**
 * assetDB 内 asset 资源自带的 library 是一个数组，需要转成对象
 * @param asset
 */
export function libArr2Obj(asset: VirtualAsset | Asset) {
    const result: { [key: string]: string } = {};
    for (const extname of asset.meta.files) {
        if (/\.\w+/.test(extname)) {
            // is extname
            result[extname] = asset.library + extname;
        } else {
            result[extname] = resolve(asset.library, extname);
        }
    }
    return result;
}

/**
 * 传入一个 uuid，查询这个 uuid 指向的资源以及资源所在的数据库
 * @param uuid
 */
export function queryAsset(uuid: string): IAsset | null {
    for (const name in Manager.AssetWorker) {
        if (!(name in Manager.AssetWorker)) {
            continue;
        }
        const database = Manager.AssetWorker[name];
        if (!database) {
            continue;
        }

        // 查找的是数据库, 由于数据库的单条数据不在 database 里，所以需要这里单独返回
        if (uuid === `db://${name}`) {
            return {
                name,
                // @ts-ignore
                asset: {
                    basename: name,
                    extname: '',
                    imported: true,
                    source: `db://${name}`,
                    subAssets: {},
                    library: '',
                    parent: null,
                    userData: {},
                    isDirectory() {
                        return false;
                    },
                    uuid: `db://${name}`,
                    meta: {
                        ver: '1.0.0',
                        uuid: `db://${name}`,
                        subMetas: {},
                        userData: {},
                        importer: 'database',
                        imported: true,
                        files: [],
                    },
                } as Asset,
            };
        }

        const asset = database.getAsset(uuid || '');
        if (asset) {
            return { name, asset };
        }
    }
    return null;
}

/**
 * 将一个 Asset 转成 info 对象
 * @param database
 * @param asset
 */
export async function encodeAsset(database: AssetDB, asset: VirtualAsset | Asset) {
    const importer = database.name2importer[asset.meta.importer] || null;

    let name = '';
    let source = '';
    let file = '';

    if (asset instanceof Asset && asset.source) {
        name = basename(asset.source);
        source = path2url(asset.source, database.options.name);
        file = asset.source;
    } else {
        const splits = asset.uuid.split('@');
        name = splits[splits.length - 1] || '';
    }

    // 整理跳转数据
    let redirect;
    if (asset.meta.userData && asset.meta.userData.redirect) {
        const redirectInfo = queryAsset(asset.meta.userData.redirect);
        if (redirectInfo) {
            const redirectImporter = database.name2importer[redirectInfo.asset.meta.importer] || null;
            redirect = {
                uuid: redirectInfo.asset.uuid,
                // @ts-ignore
                type: redirectImporter ? (redirectImporter.assetType || 'cc.Asset') : 'cc.Asset',
            };
        }
    }

    const info: IAssetInfo = {
        name,
        source,
        file, // 实际磁盘路径
        uuid: asset.uuid,
        importer: asset.meta.importer,
        // @ts-ignore
        type: importer ? (importer.assetType || 'cc.Asset') : 'cc.Asset',
        isDirectory: await asset.isDirectory(),
        library: libArr2Obj(asset),
        subAssets: {},
        // @ts-ignore
        visible: database.options.visible,
        // @ts-ignore
        readonly: database.options.readonly,
        redirect,
    };

    for (const name in asset.subAssets) {
        if (!(name in asset.subAssets)) {
            continue;
        }
        const childInfo: IAssetInfo = await encodeAsset(database, asset.subAssets[name]);
        info.subAssets[name] = childInfo;
    }

    return info;
}

// 整理出需要在删除资源后传播的主要信息
export function tranAssetInfo(asset: any) {
    const info = {
        file: asset.source,
        uuid: asset.uuid,
        library: libArr2Obj(asset),
        importer: asset.meta.importer,
    };
    return info;
}
