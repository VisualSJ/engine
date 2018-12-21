const db = require('./tree-db');

/**
 * 不能执行 删除 操作的资源
 * 以下情况，目前可沿用 canNotDeleteNode 的逻辑判断
 * @param node
 */
exports.canNotDeleteNode = (node: ItreeNode) => {
    return !node || node.readOnly ? true : false;
};

/**
 * 不能执行 复制 操作的资源
 * @param node
 */
exports.canNotCopyNode = (node: ItreeNode) => {
    return exports.canNotDeleteNode(node);
};

/**
 * 不能执行 重名命 操作的资源
 * @param node
 */
exports.canNotRenameNode = (node: ItreeNode) => {
    return exports.canNotDeleteNode(node);
};

/**
 * 不能执行 拖动 操作的资源
 * @param node
 */
exports.canNotDragNode = (node: ItreeNode) => {
    return exports.canNotDeleteNode(node);
};

/**
 * 不能执行 粘贴 操作的资源
 * @param node
 */
exports.canNotPasteNode = (node: ItreeNode) => {
    return exports.canNotDeleteNode(node);
};

/**
 * 重置某些属性，比如全部折叠或全部展开
 * @param obj
 * @param props
 */
exports.resetTreeProps = (props: any, tree: ItreeNode[] = db.nodesTree.children) => {
    tree.forEach((node: ItreeNode) => {
        for (const k of Object.keys(props)) {
            const uuid = node.uuid;
            // @ts-ignore
            node[k] = props[k];
        }

        if (node.children) {
            exports.resetTreeProps(props, node.children);
        }
    });
};

/**
 * 获取一组节点的位置信息
 * 节点对象 node,
 * 对象所在数组索引 index，
 * 所在数组 array，
 * 所在数组其所在的对象 object
 * 返回 [node, index, array, object]
 *
 * 找不到节点 返回 []
 * @param arr
 * @param uuid
 */
exports.getGroupFromTree = (obj: ItreeNode, value: string = '', key: string = 'uuid'): any => {
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
exports.getNodeFromTree = (uuid: string) => {
    return db.uuidNodes[uuid];
};

/**
 * 更快速地找到单个资源节点
 */
exports.getNodeFromMap = (uuid = '') => {
    for (const [top, node] of db.nodesMap) {
        if (uuid === node.uuid) {
            return node;
        }
    }
    return;
};

/**
 * 找到当前节点及其前后节点
 * [current, prev, next]
 */
exports.getSiblingsFromMap = (uuid = '') => {
    const nodes = Array.from(db.nodesMap.values());
    const length = nodes.length;
    let current = nodes[0];
    let next = nodes[1];
    let prev = nodes[length - 1];
    let i = 0;

    for (const [top, json] of db.nodesMap) {
        if (uuid === json.uuid) {
            current = json;
            next = nodes[i + 1];
            if (i + 1 >= length) {
                next = nodes[0];
            }
            prev = nodes[i - 1];
            if (i - 1 < 0) {
                prev = nodes[length - 1];
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
    const one = exports.getNodeFromMap(uuid);
    if (one) { // 如果 A ：存在，
        // 情况 B ：判断是否在可视范围，
        const min = db.vm.scrollTop - db.nodeHeight;
        const max = db.vm.scrollTop + db.vm.viewHeight - db.nodeHeight;

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
        if (uuid === db.nodesTree.uuid) { // 根节点的除外
            return;
        }

        if (exports.expandNode(uuid)) {
            db.vm.changeData();

            // setTimeOut 是为了避免死循环
            setTimeout(() => {
                exports.scrollIntoView(uuid);
            }, 200);
        }
    }
};

/**
 * 展开树形节点
 */
exports.expandNode = (uuid: string): boolean => {
    const [node, index, arr, parent] = exports.getGroupFromTree(db.nodesTree, uuid);
    if (!node) {
        return false;
    }
    node.isExpand = true;
    if (parent && parent.uuid) {
        return exports.expandNode(parent.uuid);
    }
    return true;
};

/**
 * 获取被拷贝节点的 dumpdata 数据
 * @param uuids 数组格式
 */
export async function getCopyData(uuids: string[]) {
    const rt: any = {
        uuids: [],
        dumps: {},
    };

    // 剔除不能被复制的节点
    for (const uuid of uuids) {
        const node = exports.getNodeFromTree(uuid);
        if (!exports.canNotCopyNode(node)) {
            rt.uuids.push(uuid);
            await getDump(uuid);
        }
    }

    async function getDump(uuid: string) {
        if (!uuid) {
            return;
        }

        const node = exports.getNodeFromTree(uuid);
        if (!exports.canNotCopyNode(node)) {
            const dumpdata = await db.getDumpdata(uuid);
            rt.dumps[uuid] = dumpdata;

            // 循环子节点
            if (Array.isArray(dumpdata.children.value)) {
                for (const child of dumpdata.children.value) {
                    await getDump(child.value.uuid);
                }
            }
        }
    }
    return rt;
}

/**
 * 外部修改资源后，检测需要闪烁一下的资源
 */
export const twinkle = {
    timer: 0,
    watch: true,
    start() {
        this.watch = true;
    },
    stop() {
        this.watch = false;
    },
    sleep(time: number) {
        // 停止检测，遇到用户主动导入文件，复制文件夹等操作
        this.watch = false;

        clearTimeout(this.timer);
        // @ts-ignore
        this.timer = setTimeout(() => {
            this.watch = true;
        }, time || 2000);

        // 避免一些无效的记录一直存在
        db.vm.twinkles = [];
    },
    add(uuid: string) {
        if (this.watch) {
            db.vm.twinkles.push(uuid);

            // 动画结束后删除
            setTimeout(() => {
                db.vm.twinkles.splice(db.vm.twinkles.findIndex((one: string) => one === uuid), 1);
            }, 1000);
        }
    },
};
