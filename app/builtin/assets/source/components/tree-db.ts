'use strict';
import { extname } from 'path';

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

// 生成一个标准的 ItreeAsset 对象
export function newItreeAsset() {
    return {
        name: '',
        source: '',
        file: '',
        uuid: '',
        importer: '',
        type: '',
        isDirectory: false,
        library: {},
        subAssets: {},
        visible: true,
        readonly: false,

        fileName: '',
        fileExt: '',
        parentSource: '',
        parentUuid: '',
        isExpand: false,
        isParent: false,
        isRoot: false,
        isSubAsset: false,
        state: '',
        depth: 0,
        top: 0,
        left: 0,
        _height: 0,
        height: 0,
        children: [],
    };
}

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
    const arr: ItreeAsset[] = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');

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
            data.subAssets[name] = newItreeAsset();
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

        const nextDir = dir.slice();
        nextDir.push(name);
        toAssetsTree(subAsset, subTree, nextDir);
    }

    if (asset.children.length > 1) {
        sortTree(asset.children);
    }
}

/**
 * 处理单个资源的属性
 * @param asset 资源对象
 * @param dir 所在的 source 拆分出来的路径数组
 * @param name 完整的文件名称
 */
function assetAttr(asset: ItreeAsset, dir: string[], name: string) {
    if (!asset || !asset.subAssets) {
        return; // 容错处理
    }

    const subAssets = Object.keys(asset.subAssets);

    asset.name = name;
    asset.fileExt = extname(name);
    asset.fileName = name.substr(0, name.lastIndexOf(asset.fileExt));
    asset.parentSource = dir.join('/');
    asset.isRoot = dir.length === 1 ? true : false;
    asset.isDirectory = asset.isRoot ? true : asset.isDirectory;
    asset.isParent = subAssets.length > 0 ? true : asset.isDirectory; // 树形的父级三角形依据此字段
    asset.isSubAsset = asset.source ? false : true;
    asset.state = '';

    // 处理有 redirect 资源的情况
    if (asset.redirect) {
        asset.type = asset.redirect.type;
        // asset.redirect.uuid 不可替换 asset.uuid ，因为 uuid 是唯一值
    }
}

/**
 * 目录文件和文件夹排序
 * @param arr
 */
function sortTree(arr: ItreeAsset[]) {
    // 优化原本的 localCompare 方法，性能提升：1000 空节点 1103ms -> 31ms
    const collator = new Intl.Collator('en', {
        numeric: true,
        sensitivity: 'base',
    });

    // @ts-ignore;
    arr.sort((a: ItreeAsset, b: ItreeAsset) => {
        // 文件夹优先
        if (a.isDirectory === true && !b.isDirectory) {
            return -1;
        } else if (!a.isDirectory && b.isDirectory === true) {
            return 1;
        } else {
            if (vm.sortType === 'ext' && a.fileExt !== b.fileExt) {
                return collator.compare(a.fileExt, b.fileExt);
            } else {
                return collator.compare(a.name, b.name);
            }
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
            vm.$set(vm.folds, asset.uuid, vm.firstAllExpand);
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
            if (!asset.isRoot) {
                let legal = false;

                if (vm.searchType === 'name' && asset.name.search(vm.search) !== -1) { // 平级保存
                    legal = true;
                }
                if (vm.searchType === 'uuid' && asset.uuid.search(vm.search) !== -1) { // 平级保存
                    legal = true;
                }
                if (vm.searchType === 'type' && asset.importer.search(vm.search) !== -1) { // 平级保存
                    legal = true;
                }

                if (legal) {
                    asset.depth = 0; // 平级保存
                    assetsMap.set(start, asset);
                    index++;
                }
            }

            if (asset.isParent) {
                index = calcAssetPosition(asset, index, 0);
            }
        }

        // 收集 type 数据
        vm.types[asset.type] = 1;
    });
    // 返回序号
    return index;
}

/**
 * 增加文件夹的高度
 * add 为数字，1 表示有一个 children
 */
function addHeight(add: number) {
    // @ts-ignore
    const asset = this; // this 是 bind 过来的
    if (add > 0) {
        asset._height += assetHeight * add;

        // 触发其父级高度也增加
        const parent = uuidAssets[asset.parentUuid];
        if (parent) {
            parent.height = add;
        }
    } else {
        asset._height = assetHeight;
    }
}

/**
 * 计算一个文件夹的完整高度
 */
function calcDirectoryHeight() {
    for (const [top, parent] of assetsMap) {

        if (parent.isExpand && parent.children && parent.children.length > 0) {
            // 重要 hack：避免 customSetter 被 vue 的 setter 优先 return 掉，而不触发 customSetter
            if (parent.isRoot && parent.height === parent.children.length) {
                parent._height += assetHeight * parent.children.length;
                continue;
            }

            parent.height = parent.children.length; // 实际计算在内部的 setter 函数
        } else {
            parent.height = 0;
        }
    }
}
