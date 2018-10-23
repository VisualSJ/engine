'use strict';

/**
 * 传入一个资源数据库返回的数据数组，转换成树形结构
 * @param {*} array asset-db 返回的整个数组
 */
function arrayToTree(array, cache = {}) {
    const assets = { subAssets: cache.tree || {}, };
    const uuid2asset = cache.map || {};
    const url2uuid = cache.url2uuid || {};

    function step(asset, data) {
        if (typeof data !== 'object') {
            if (!asset.source.startsWith('db://')) {
                return;
            }

            const paths = asset.source.substr(5).split('/');

            // 根据搜索路径，补全路径上缺失的所有数据
            data = assets;
            for (const name of paths) {
                if (!name) {
                    continue;
                }
                // 如果当前的路径不存在，则生成默认的路径
                data = data.subAssets[name] = data.subAssets[name] || { subAssets: {}, };
            }
        }

        data.uuid = asset.uuid;

        // 如果有 subAssets 则递归继续查询内部的 subAssets
        for (const name in asset.subAssets) {
            if (!asset.subAssets[name]) {
                continue;
            }
            data.subAssets[name] = { subAssets: {}, };
            step(asset.subAssets[name], data.subAssets[name]);
        }

        uuid2asset[asset.uuid] = asset;
        if (asset.source) {
            url2uuid[asset.source] = asset.uuid;
        }
    }

    array.forEach(step);

    return {
        tree: assets.subAssets,
        map: uuid2asset,
        url2uuid,
    };
}

/**
 * 文字排序
 * @param {string} a
 * @param {string} b
 */
function nameSort(a, b) {
    return a.localeCompare(b);
}

/**
 * 传入一个树形结构的资源数据，提取出可显示的数据，并转成数组
 * @param {*} tree
 * @param {*} foldMap
 * @param {*} assetMap
 * @param {*} filter
 */
function treeToShowArray(tree, foldMap, assetMap, filter) {
    const array = [];

    /**
     * 按步递归查询每个资源
     */
    function stepSubAsset(asset, indent, parent) {
        const names = Object.keys(asset.subAssets);

        const dirs = [];
        const files = [];

        // 将文件夹和文件分类
        for (const name of names) {
            const uuid = asset.subAssets[name].uuid;
            const child = assetMap[uuid];
            if (child && child.isDirectory) {
                dirs.push(name);
            } else {
                files.push(name);
            }
        }

        // 分别排序
        dirs.sort(nameSort);
        files.sort(nameSort);

        // 将文件夹放到数组内
        dirs.forEach((name) => {
            const subAsset = asset.subAssets[name];
            const child = assetMap[subAsset.uuid];

            // 如果过滤条件不满足，则跳过添加
            if (!filter || name.indexOf(filter) !== -1) {
                array.push({
                    name: name,
                    source: child.source,
                    type: 'directory',
                    uuid: child.uuid,
                    indent: filter ? 0 : indent,
                    folder: true,
                    parent,
                });
            }

            // 如果当前文件夹已经折叠，就不需要循环内部数据了
            // 如果有过滤条件，则忽略这一限制
            if (!filter && foldMap[child.uuid]) {
                return;
            }
            stepSubAsset(subAsset, indent + 1, child.uuid);
        });

        // 将文件放到数组内，不存在的文件会被当作未知文件，渲染的时候全部当成未知文件处理
        files.forEach((name) => {
            const subAsset = asset.subAssets[name];
            const child = assetMap[subAsset.uuid];

            // 如果过滤条件不满足，则不添加
            if (filter && name.indexOf(filter) === -1) {
                return;
            }

            const item = {
                name: name,
                source: child ? child.source || '' : '',
                type: child ? child.importer : '*',
                uuid: child ? child.uuid : '',
                indent: filter ? 0 : indent,
                folder: !!Object.keys(subAsset.subAssets).length,
                parent,
            };

            array.push(item);

            // 如果有 subAssets，则需要递归
            if (!item.folder) {
                return;
            }

            // 如果当前文件夹已经折叠，就不需要循环内部数据了
            // 如果有过滤条件，则忽略这一限制
            if (!filter && foldMap[child.uuid]) {
                return;
            }

            stepSubAsset(subAsset, indent + 1, child.uuid);
        });
    }

    const dbs = Object.keys(tree);
    for (const db of dbs) {
        const uuid = `db://${db}`;

        if (!filter) {
            array.push({
                name: db,
                source: uuid,
                type: 'database',
                uuid: uuid,
                indent: 0,
                folder: true,
                parent: '',
            });
        }

        // 如果当前数据库已经折叠，就不需要循环内部数据了
        // 如果有过滤条件，则忽略这一限制
        if (!filter && foldMap[uuid]) {
            continue;
        }

        stepSubAsset(tree[db], 1, uuid);
    }

    return array;
}

module.exports = {
    arrayToTree,
    treeToShowArray,
};
