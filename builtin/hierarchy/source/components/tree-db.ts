'use strict';

export let nodesTree: any; // 树形结构的数据，含 children
export const uuidNodes: any = {}; // uuid: node 键值对
export const trash: any = {}; // 回收站，主要用于移动中，异步的先从一个父级删除节点，再添加另一个父级的过程

/**
 * 考虑到 key 是数字且要直接用于运算，Map 格式的效率会高一些
 * 将所有有展开的节点按照 key = position.top 排列，value = ItreeNode
 * 注意：仅包含有展开显示的节点
 */
export const nodesMap: Map<number, ItreeNode> = new Map();

export let vm: any; // 承接 tree vm 的参数配置

export const nodeHeight: number = 20; // 配置每个节点的高度，需要与css一致
export const iconWidth: number = 18; // 树形节点 icon 的宽度
export const padding: number = 4; // 树形头部的间隔，为了保持美观

/**
 * 刷新
 */
export async function refresh() {
    const arr = await Editor.Ipc.requestToPackage('scene', 'query-node-tree');

    if (!arr) { // 数据可能为空
        return;
    }

    reset();
    toNodesTree(arr);
}

/**
 * 重置数据
 */
export function reset() {
    nodesTree = null;
}

/**
 * 形成一个合法的树形数据
 */
function toNodesTree(arr: ItreeNode[]) {
    nodesTree = arr;

    function step(node: ItreeNode) {
        uuidNodes[node.uuid] = node;

        if (node.children && node.children.length > 0) {
            node.children.forEach((child: ItreeNode) => {
                step(child);
            });
        }
    }

    step(nodesTree);
}

/**
 * 重新计算树形数据
 */
export function calcNodesTree() {
    nodesMap.clear(); // 清空数据

    calcNodePosition(); // 重算排位

    calcDirectoryHeight(); // 计算文件夹的高度
}

/**
 * 添加节点
 */
export async function addNode(uuid: string) {
    // 获取该节点最新数据
    const dumpData = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
    // 更新当前数据
    const newNode = addNodeIntoTree(dumpData);
}

/**
 * 添加节点后数据调整
 */
function addNodeIntoTree(dumpData: any) {
    const uuid = dumpData.uuid.value;
    const type = dumpData.__type__;
    const parentUuid = dumpData.parent.value.uuid;

    const newNode: ItreeNode = {
        name: dumpData.name.value,
        uuid,
        children: [],
        type,

        readOnly: false,
        top: 0,
        left: 0,
        depth: 0,
        isParent: false,
        isExpand: false,
        state: '',
        parentUuid,
        _height: 0,
        height: 0,
    };
    uuidNodes[newNode.uuid] = newNode;

    // 父级节点
    let parentNode = uuidNodes[parentUuid];
    if (!parentNode) {
        parentNode = nodesTree;
    }
    if (!Array.isArray(parentNode.children)) {
        parentNode.children = [];
    }
    parentNode.children.push(newNode);
    parentNode.isExpand = true;

    return newNode;
}

/**
 * 节点发生变动
 */
export async function changeNode(uuid: string) {
    // 获取该节点最新数据
    const newData = await Editor.Ipc.requestToPackage('scene', 'query-node', uuid);
    // 更新当前数据
    if (!newData) {
        return;
    }

    if (Editor.Project.type === '3d') {
        changeNode3D(newData);
    }
    if (Editor.Project.type === '2d') {
        changeNode2D(newData);
    }
}

/**
 * 改变 2d 节点后数据调整
 * @param uuid 现有节点的uuid
 * @param newData 新的数据包
 */
function changeNode2D(newData: any) {
    const uuid = newData.uuid.value;
    // 现有的节点数据
    const node = uuidNodes[uuid];

    if (!node) {
        console.error('Can not find the node.');
        return;
    }
    // 属性是值类型的修改
    ['name'].forEach((key) => {
        // @ts-ignore
        if (node[key] !== newData[key].value) {
            // @ts-ignore
            node[key] = newData[key].value;
        }
    });

    if (!Array.isArray(node.children)) {
        node.children = [];
    }

    // children 是否有变动
    const nowChildren = JSON.stringify(node.children.map((one: ItreeNode) => one.uuid));
    const newChildren = JSON.stringify(newData.children.value.map((one: any) => one.value));
    if (nowChildren !== newChildren) {
        // 先保存原先的节点，例如在粘贴节点后进行 undo 操作，需要此操作保存已粘贴成功了的节点
        node.children.map((child: ItreeNode) => {
            return child.uuid;
        }).forEach((uuid: string) => {
            vm.delete(uuid, node.uuid);
        });

        // 属性值是对象类型的修改， 如 children
        node.children = newData.children.value.map((json: any) => {
            const uuid: string = json.value;
            return uuidNodes[uuid];
        }).filter(Boolean);
    }

    // 重置掉 loading 效果
    node.state = '';

    return node;
}

/**
 * 改变 2d 节点后数据调整
 * @param uuid 现有节点的uuid
 * @param newData 新的数据包
 */
function changeNode3D(newData: any) {
    const uuid = newData.uuid.value;
    // 现有的节点数据
    const node = uuidNodes[uuid];

    if (!node) {
        console.error('Can not find the node.');
        return;
    }
    // 属性是值类型的修改
    ['name'].forEach((key) => {
        // @ts-ignore
        if (node[key] !== newData[key].value) {
            // @ts-ignore
            node[key] = newData[key].value;
        }
    });

    if (!Array.isArray(node.children)) {
        node.children = [];
    }

    // children 是否有变动，注意 2d 和 3d 数据结构有差别: children
    const nowChildren = JSON.stringify(node.children.map((one: ItreeNode) => one.uuid));
    const newChildren = JSON.stringify(newData.children.value.map((one: any) => one.value.uuid));
    if (nowChildren !== newChildren) {
        // 先保存原先的节点，例如在粘贴节点后进行 undo 操作，需要此操作保存已粘贴成功了的节点
        node.children.map((child: ItreeNode) => {
            return child.uuid;
        }).forEach((uuid: string) => {
            vm.delete(uuid, node.uuid);
        });

        // 属性值是对象类型的修改， 如 children
        node.children = newData.children.value.map((one: any) => {
            const uuid: string = one.value.uuid;
            return uuidNodes[uuid];
        }).filter(Boolean);
    }

    // 重置掉 loading 效果
    node.state = '';
    return node;
}

/**
 * 计算所有树形资源的位置数据，这一结果用来做快速检索
 * 重点是设置 nodesMap 数据
 * 返回当前序号
 * @param nodes
 * @param index 资源的序号
 * @param depth 资源的层级
 */
function calcNodePosition(nodes = nodesTree, index = 0, depth = 0) {
    if (!nodes || !Array.isArray(nodes.children)) {
        return index;
    }

    nodes.children.forEach((node: ItreeNode) => {
        if (!node) {
            return;
        }

        const start = index * nodeHeight;  // 起始位置

        // 扩展属性
        node.depth = depth;
        node.top = start;
        node.left = depth * iconWidth + padding;
        node.state = node.state ? node.state : '';
        node.isParent = node.children && node.children.length > 0 ? true : false;
        node.parentUuid = nodes.uuid;

        if (node.isExpand === undefined) {
            Object.defineProperty(node, 'isExpand', {
                configurable: true,
                enumerable: true,
                get() {
                    return vm.folds[node.uuid];
                },
                set(val) {
                    vm.folds[node.uuid] = val;
                },
            });
        }

        if (vm.folds[node.uuid] === undefined) {
            vm.folds[node.uuid] = node.isParent ? true : false;
        }

        if (node.height === undefined) {
            Object.defineProperty(node, 'height', {
                configurable: true,
                enumerable: true,
                get() {
                    return this._height;
                },
                set: addHeight.bind(node),
            });
        }

        if (vm.search === '') { // 没有搜索
            vm.state = '';
            nodesMap.set(start, node);
            index++; // index 是平级的编号，即使在 children 中也会被按顺序计算

            if (node.isParent && node.isExpand === true) { // 没有搜索的时候只需要计算已展开的层级
                // depth 是该节点的层级
                index = calcNodePosition(node, index, depth + 1);
            }
        } else { // 有搜索
            vm.state = 'search';
            // @ts-ignore
            if (!node.readOnly && node.name.search(vm.search) !== -1) { // 平级保存
                node.depth = 0; // 平级保存
                nodesMap.set(start, node);
                index++;
            }

            if (node.isParent) { // 有搜索的时候，只要有层级的都要计算
                index = calcNodePosition(node, index, 0);
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
        this._height += nodeHeight * add;

        // 触发其父级高度也增加
        for (const [top, node] of nodesMap) {
            // @ts-ignore
            if (this.parentUuid === node.uuid) {
                node.height = add;
                break;
            }
        }
    } else {
        // @ts-ignore
        this._height = nodeHeight;
    }
}

/**
 * 计算一个文件夹的完整高度
 */
function calcDirectoryHeight() {
    for (const [top, parent] of nodesMap) {
        parent.height = 0; // 先还原，0 表示它自己的高度

        if (parent.isExpand && parent.children && parent.children.length > 0) {
            // 加上子集的高度
            parent.height = parent.children.length; // 实际计算在内部的 setter 函数
        }
    }
}
