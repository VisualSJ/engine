'use strict';

const protocol = 'db://';
const uuidAssets: any = {};
const subAssetsTree: any = { subAssets: {} };
const assetsTree: any = {
    depth: -1,
    invalid: true
};
/**
 * 输出是一个数组
 */
async function refresh() {
    const arr = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');

    if (!arr) { // 数据可能为空
        return;
    }

    toSubAssetsTree(arr);
    toAssetsTree(assetsTree, subAssetsTree);
    return assetsTree;
}

async function ipcQuery(uuid: string) {
    const one = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
    // TODO
    // const arr = legalData([one]);
    // return arr;
}

/**
 * 传入一个资源数据库返回的数据数组，转换成树形结构
 */
function toSubAssetsTree(arr: ItreeAsset[]) {
    function step(asset: ItreeAsset, data: ItreeAsset) {
        if (typeof data !== 'object') {
            if (!asset.source.startsWith(protocol) || !asset.uuid) {
                return;
            }

            const paths = asset.source.substr(protocol.length).split('/');

            // 根据搜索路径，补全路径上缺失的所有数据
            data = subAssetsTree;
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

        uuidAssets[asset.uuid] = asset;
    }
    // @ts-ignore
    arr.forEach(step);
}

/**
 * 形成一个合法的树形数据
 */
function toAssetsTree(asset: ItreeAsset, tree: any, dir: string[] = [protocol]) {
    const subAssets = Object.keys(tree.subAssets);
    asset.children = [];

    for (const name of subAssets) {
        const subTree = tree.subAssets[name];
        const subAsset = uuidAssets[subTree.uuid];
        assetAttr(subAsset, dir, name);
        asset.children.push(subAsset);

        const subNames = Object.keys(subTree.subAssets);
        if (subNames.length === 0) {
            continue;
        }
        dir.push(name);
        toAssetsTree(subAsset, subTree, dir.slice());
    }
    sortTree(asset.children);
}

function assetAttr(asset: ItreeAsset, dir: string[], name: string) {
    const [fileName, fileExt] = name.split('.');
    const subAssets = Object.keys(asset.subAssets);

    asset.name = name;
    asset.fileName = fileName;
    asset.fileExt = fileExt ? fileExt : '';
    asset.parentSource = dir.join('/');
    asset.topSource = dir.slice(0, 2).join('/');
    asset.isExpand = dir.length > 1 ? false : true;
    asset.isParent = subAssets.length > 0 ? true : asset.isDirectory ? true : false; // 树形的父级三角形依据此字段
    asset.isRoot = dir.length === 1 ? true : false;
    asset.isSubAsset = asset.source ? false : true;
    // 不可用是指不在db中，第一层节点除外，不可用节点在树形结构中它依然是一个正常的可折叠节点
    asset.readOnly = asset.lock || asset.isRoot || asset.isSubAsset ? true : false; // 根节点和 subAssets 都只读
    asset.state = '';
}

/**
 * 目录文件和文件夹排序
 * @param arr
 */
function sortTree(arr: ItreeAsset[]) {
    // @ts-ignore;
    arr.sort((a: ItreeAsset, b: ItreeAsset) => {
        // 文件夹优先
        if (a.isDirectory === true && !b.isDirectory) {
            return -1;
        } else if (!a.isDirectory && b.isDirectory === true) {
            return 1;
        } else {
            return a.name.localeCompare(b.name);
        }
    });
}

exports.protocol = protocol;
exports.refresh = refresh;
exports.ipcQuery = ipcQuery;
