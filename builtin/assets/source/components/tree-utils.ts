const db = require('./tree-db');

/**
 * 不能执行 删除 操作的资源
 * @param asset
 */
exports.canNotDeleteAsset = (asset: ItreeAsset) => {
    return !asset || asset.isRoot || asset.isSubAsset || asset.readOnly ? true : false;
};

/**
 * 不能执行 复制 操作的资源
 * @param asset
 */
exports.canNotCopyAsset = (asset: ItreeAsset) => {
    return exports.canNotDeleteAsset(asset);
};

/**
 * 不能执行 重名命 操作的资源
 * @param asset
 */
exports.canNotRenameAsset = (asset: ItreeAsset) => {
    return exports.canNotDeleteAsset(asset);
};

/**
 * 不能执行 拖动 操作的资源
 * @param asset
 */
exports.canNotDragAsset = (asset: ItreeAsset) => {
    return !asset || asset.isRoot || asset.readOnly ? true : false;
};

/**
 * 不能执行 粘贴 操作的资源
 * @param asset
 */
exports.canNotPasteAsset = (asset: ItreeAsset) => {
    return !asset || asset.isSubAsset || asset.readOnly || !asset.isDirectory ? true : false;
};

/**
 * 能否在资源管理器中打开
 * @param asset
 */
exports.canNotShowInExplorer = (asset: ItreeAsset) => {
    return !asset || !asset.file || asset.isSubAsset;
};

/**
 * 获取一组资源的位置信息
 * 资源节点对象 asset,
 * 对象所在数组索引 index，
 * 所在数组 array，
 * 所在数组其所在的对象 object
 * 返回 [asset, index, array, object]
 *
 * 找不到资源 返回 []
 * @param arr
 * @param uuid
 */
exports.getGroupFromTree = (obj: ItreeAsset, value: string = '', key: string = 'uuid') => {
    let rt = [];

    if (!obj || !obj.children) {
        return [];
    }
    // @ts-ignore
    if (obj[key] === value) { // 次要寻找包体 自身对象，比如根节点自身
        return [obj];
    }

    let arr = obj.children; // 主要寻找包体是 .children
    if (Array.isArray(obj)) {
        arr = obj;
    }
    for (let i = 0, ii = arr.length; i < ii; i++) {
        const one = arr[i];
        if (!one) { // 容错处理，在 change 和 add 后，children 存在空值
            continue;
        }
        // @ts-ignore
        if (one[key] === value) { // 全等匹配
            return [one, i, arr, obj]; // 找到后返回的数据格式
        }

        if (one.children && one.children.length !== 0) { // 如果还有 children 的继续迭代查找
            rt = exports.getGroupFromTree(one, value, key);

            if (rt.length > 0) { // 找到了才返回，找不到，继续循环
                return rt;
            }
        }
    }

    return rt;
};

/**
 * 在树形中找单个节点
 */
exports.getAssetFromTree = (uuid: string) => {
    return exports.getGroupFromTree(db.assetsTree, uuid)[0];
};

/**
 * 在现有 isExpand = true 的已显示的 Map 数据中找节点
 */
exports.getAssetFromMap = (uuid: string) => {
    for (const [top, asset] of db.assetsMap) {
        if (uuid === asset.uuid) {
            return asset;
        }
    }
    return;
};

/**
 * 找到当前节点及其前后节点
 * [current, prev, next]
 */
exports.getSiblingsFromMap = (uuid: string) => {
    const assets = Array.from(db.assetsMap.values());
    const length = assets.length;
    let current = assets[0];
    let next = assets[1];
    let prev = assets[length - 1];
    let i = 0;

    for (const [top, json] of db.assetsMap) {
        if (uuid === json.uuid) {
            current = json;
            next = assets[i + 1];
            if (i + 1 >= length) {
                next = assets[0];
            }
            prev = assets[i - 1];
            if (i - 1 < 0) {
                prev = assets[length - 1];
            }
            break;
        }
        i++;
    }
    return [current, prev, next];
};

/**
 * 滚动节点到可视范围内
 * @param uuid
 */
exports.scrollIntoView = (uuid: string) => {
    if (!uuid) {
        db.vm.$parent.$refs.viewBox.scrollTo(0, 0);
        return;
    }
    // 情况 A ：判断是否已在展开的节点中，
    const one = exports.getAssetFromMap(uuid);
    if (one) { // 如果 A ：存在，
        // 情况 B ：判断是否在可视范围，
        const min = db.vm.scrollTop - db.assetHeight;
        const max = db.vm.scrollTop + db.vm.viewHeight - db.assetHeight;

        // 优化滚动
        const offsetWidth = db.vm.$parent.$refs.viewBox.offsetWidth;
        const scrollWidth = db.vm.$parent.$refs.viewBox.scrollWidth;
        let scrollLeft = db.vm.$parent.$refs.viewBox.scrollLeft;
        let scrollTop = db.vm.$parent.$refs.viewBox.scrollTop;
        const overflowLeft = scrollLeft > one.left;
        const overflowRight = offsetWidth < scrollWidth && offsetWidth * 0.3 < one.left - scrollLeft;
        if (overflowLeft || overflowRight) { // 有 x 方向滚动，且单条资源的起始点在容器左边的30%处的右边，
            scrollLeft = one.left - db.iconWidth * 2; // 在 x 方向滚动下有利于用户阅读
        }

        if (one.top <= min || one.top >= max) {
            // 如果 B：不是，则滚动到可视的居中范围内
            scrollTop = one.top - db.vm.viewHeight / 2;
        }
        db.vm.$parent.$refs.viewBox.scrollTo(scrollLeft, scrollTop);
        return;
    } else { // 如果 A ：不存在，展开其父级节点，迭代循环展开其祖父级节点，滚动到可视的居中范围内
        if (uuid === db.assetsTree.uuid) { // 根节点的除外
            return;
        }

        if (exports.expandAsset(uuid)) {
            db.vm.changeData();

            // setTimeOut 是为了避免死循环
            setTimeout(() => {
                exports.scrollIntoView(uuid);
            }, 200);
        }
    }
};

/**
 * 展开树形资源节点
 */
exports.expandAsset = (uuid: string): boolean => {
    const [asset, index, arr, parent] = exports.getGroupFromTree(db.assetsTree, uuid);
    if (!asset) {
        return false;
    }
    asset.isExpand = true;
    if (parent && parent.uuid) {
        return exports.expandAsset(parent.uuid);
    }
    return true;
};

/**
 * 重置某些属性，比如全部折叠或全部展开
 * @param obj
 * @param props
 */
exports.resetTreeProps = (props: any, tree: ItreeAsset[] = db.assetsTree.children) => {
    const keys = Object.keys(props);
    tree.forEach((asset: ItreeAsset) => {
        for (const k of keys) {
            // @ts-ignore
            asset[k] = props[k];
        }

        if (asset.children) {
            exports.resetTreeProps(props, asset.children);
        }
    });
};

exports.closestCanPasteAsset = (uuid: string) => {
    const asset = exports.getAssetFromTree(uuid);
    if (asset) {
        if (exports.canNotPasteAsset(asset)) {
            return exports.closestCanPasteAsset(asset.parentUuid);
        } else {
            return asset;
        }
    } else {
        return;
    }
};
