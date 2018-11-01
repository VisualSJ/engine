declare interface IdragNode {
    from: string; // 被拖动的节点
    to: string; // 被指向的节点
    insert: string; // 插入方式，有三种：inside, before, after
}

declare interface IaddNode {
    type: string; // 一个节点的类型
    name: string; // 节点的名称
}

declare interface ItreeNode {
    name: string; // 来自 scene 场景的查询数据
    uuid: string;
    type: string;
    children: ItreeNode[];

    // 以下是扩展的数据
    invalid: boolean; // 是否可用
    isLock: boolean; // 是否锁定
    top: number; // top 位置
    left: number; // 缩进的大小
    depth: number; // 树形层级
    isParent: boolean; // 是否是父节点
    isExpand: boolean; // 是否展开显示
    state: string; // 状态
    parentUuid: string; // 父级的 uuid
    _height: number; // 整个节点包括children的高度
    height: number; // 整个节点包括children的高度
}
