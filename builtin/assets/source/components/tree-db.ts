'use strict';

export const protocol = 'db://';
export const uuidAssets: any = {};
export let subAssetsTree: any;
export let assetsTree: any; // 树形结构的数据，含 children
/**
 * 考虑到 key 是数字且要直接用于运算，Map 格式的效率会高一些
 * 将所有有展开的资源按照 key = position.top 排列，value = ItreeAsset
 * 注意：仅包含有展开显示的资源
 */
export const assetsMap: Map<number, ItreeAsset> = new Map();

export let vm: any; // 承接 tree vm 的参数配置

export const assetHeight: number = 20; // 配置每个资源的高度，需要与css一致
export const iconWidth: number = 18; // 树形节点 icon 的宽度
export const padding: number = 4; // 树形头部的间隔，为了保持美观
export const extToFileType = {
    js: 'javascript',
    fire: 'scene',
    json: 'json',
    ts: 'typescript',
};

/**
 * refresh 的时候需要重置数据
 */
export function reset() {
    subAssetsTree = {
        subAssets: {},
    };

    assetsTree = {
        depth: -1,
    };

}

/**
 * 刷新
 */
export async function refresh() {
    const arr = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');

    if (!arr) { // 数据可能为空
        return;
    }

    reset();
    toSubAssetsTree(arr);
    toAssetsTree(assetsTree, subAssetsTree, []);
}

/**
 * 重新计算树形数据
 */
export function calcAssetsTree() {
    assetsMap.clear(); // 清空数据

    calcAssetPosition(); // 重算排位

    calcDirectoryHeight(); // 计算文件夹的高度
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
                data = data.subAssets[name] = data.subAssets[name] || { subAssets: {} };
            }
        }

        data.uuid = asset.uuid;

        // 如果有 subAssets 则递归继续查询内部的 subAssets
        for (const name in asset.subAssets) {
            if (!asset.subAssets[name]) {
                continue;
            }
            data.subAssets[name] = { subAssets: {} };
            step(asset.subAssets[name], data.subAssets[name]);
        }

        uuidAssets[asset.uuid] = asset;
    }
    // @ts-ignore
    arr.forEach(step);
}

/**
 * 形成一个合法的树形数据
 * @param asset 格式为 assetsTree
 * @param tree 格式为 subAssetsTree
 * @param dir 格式类似为 ['db:/', 'assets','New Folder']
 */
function toAssetsTree(asset: ItreeAsset, tree: any, dir: string[]) {
    const subAssets = Object.keys(tree.subAssets);
    asset.children = [];
    const init = dir.length === 0 ? true : false;

    for (const name of subAssets) {
        if (init) {
            dir = ['db:/']; // 少掉一个斜杆是为了让数组.join('/')时能完整
        }
        const subTree = tree.subAssets[name];
        const subAsset = uuidAssets[subTree.uuid];

        // 增加组件所需要用到的属性
        assetAttr(subAsset, dir, name);

        // 载入父级
        if (subAsset.visible) {
            asset.children.push(subAsset);
        }

        const subNames = Object.keys(subTree.subAssets);
        if (subNames.length === 0) {
            continue;
        }
        dir.push(name);
        toAssetsTree(subAsset, subTree, dir.slice());
    }
    sortTree(asset.children);
}

/**
 * 处理单个资源的属性
 * @param asset 资源对象
 * @param dir 所在的 source 拆分出来的路径数组
 * @param name 完整的文件名称
 */
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

/**
 * 计算所有树形资源的位置数据，这一结果用来做快速检索
 * 重点是设置 assetsMap 数据
 * 返回当前序号
 * @param assets
 * @param index 资源的序号
 * @param depth 资源的层级
 */
function calcAssetPosition(assets = assetsTree, index = 0, depth = 0) {
    if (!assets || !Array.isArray(assets.children)) {
        return index;
    }

    assets.children.forEach((asset: ItreeAsset) => {
        if (!asset) {
            return;
        }

        const start = index * assetHeight;  // 起始位置

        // 扩展属性
        asset.depth = depth;
        asset.top = start;
        asset.left = depth * iconWidth + padding;
        asset._height = assetHeight;
        asset.parentUuid = assets.uuid;

        if (asset.isExpand === undefined) {
            Object.defineProperty(asset, 'isExpand', {
                configurable: true,
                enumerable: true,
                get() {
                    return vm.folds[asset.uuid];
                },
                set(val) {
                    vm.folds[asset.uuid] = val;
                },
            });
        }

        if (vm.folds[asset.uuid] === undefined) {
            vm.folds[asset.uuid] = asset.isDirectory ? false : true; // directory 默认折叠
        }

        if (asset.height === undefined) {
            Object.defineProperty(asset, 'height', {
                configurable: true,
                enumerable: true,
                get() {
                    return this._height;
                },
                set: addHeight.bind(asset),
            });
        }

        if (vm.search === '') { // 没有搜索
            vm.state = '';
            assetsMap.set(start, asset);
            index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

            if (asset.isParent && asset.isExpand === true) {
                index = calcAssetPosition(asset, index, depth + 1); // depth 是该资源的层级
            }
        } else { // 有搜索
            vm.state = 'search';

            // @ts-ignore
            if (!asset.isRoot && asset.name.search(vm.search) !== -1) { // 平级保存
                asset.depth = 0; // 平级保存
                assetsMap.set(start, asset);
                index++;
            }

            if (asset.isParent) {
                index = calcAssetPosition(asset, index, 0);
            }
        }
    });
    // 返回序号
    return index;
}

/**
 * 增加文件夹的高度
 * add 为数字，1 表示有一个 children
 */
function addHeight(add: number) {
    if (add > 0) {
        // @ts-ignore
        this._height += assetHeight * add;

        // 触发其父级高度也增加
        for (const [top, asset] of assetsMap) {
            // @ts-ignore
            if (this.parentUuid === asset.uuid) {
                asset.height = add;
                break;
            }
        }
    } else {
        // @ts-ignore
        this._height = assetHeight;
    }
}

/**
 * 计算一个文件夹的完整高度
 */
function calcDirectoryHeight() {
    for (const [top, parent] of assetsMap) {
        if (parent.isExpand && parent.children && parent.children.length > 0) {
            parent.height = parent.children.length; // 实际计算在内部的 setter 函数
        } else {
            parent.height = 0;
        }
    }
}
