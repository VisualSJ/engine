declare interface IdragNode {
    /**
     * 拖动 start 的起始赋值
     * 赋值节点各自的类型
     * 外部资源的情况包括资源可能的所有类型，
     * 是否接受该类型需要在 drop 中明确判断
     */
    type: string; 
    from?: string; // 被拖动的节点 uuid
    to: string; // 被指向的节点 uuid
    insert: string; // 插入方式，有三种：inside, before, after
    copy: boolean; // 是否是拖动复制
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
    prefab: any;
    parent: string;

    // 以下是扩展的数据
    isPrefab: boolean; // 是否是 prefab
    readOnly: boolean; // 是否是只读
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
