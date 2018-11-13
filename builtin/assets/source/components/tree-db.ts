import { inherits } from 'util';

'use strict';

const protocol = 'db://';
const uuidAssets: any = {};
let subAssetsTree: any;
let assetsTree: any;

function reset() {
    subAssetsTree = {
        subAssets: {}
    };

    assetsTree = {
        depth: -1,
        invalid: true
    };
}

/**
 * 输出是一个数组
 */
async function refresh() {
    const arr = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');

    if (!arr) { // 数据可能为空
        return;
    }

    reset();
    toSubAssetsTree(arr);
    toAssetsTree(assetsTree, subAssetsTree);
    return assetsTree;
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
function toAssetsTree(asset: ItreeAsset, tree: any, dir: string[]) {
    const subAssets = Object.keys(tree.subAssets);
    asset.children = [];
    const init = !dir ? true : false;

    for (const name of subAssets) {
        if (init) {
            dir = ['db:/']; // 少掉一个斜杆是为了让数组.join('/')时能完整
        }
        const subTree = tree.subAssets[name];
        const subAsset = uuidAssets[subTree.uuid];

        // 增加组件所需要用到的属性
        assetAttr(subAsset, dir, name);

        // 载入父级
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
    asset.isRoot = dir.length === 1 ? true : false;
    // 这个兼容处理 window 和 mac 上对 database 的 isDirectory 不同的数据返回，window 上 true, mac 上 false
    asset.isDirectory = asset.isRoot ? true : asset.isDirectory;
    asset.isParent = subAssets.length > 0 ? true : asset.isDirectory; // 树形的父级三角形依据此字段
    asset.isSubAsset = asset.source ? false : true;
    // 不可用是指不在db中，第一层节点除外，不可用节点在树形结构中它依然是一个正常的可折叠节点
    asset.readOnly = (asset.lock || asset.isSubAsset) ? true : false; // 根节点和 subAssets 都只读
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
