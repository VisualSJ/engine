declare interface IdragNode {
    from: string; // 被拖动的节点
    to: string; // 被指向的节点
    insert: string; // 插入方式，有三种：inside, before, after
}

declare interface ItreeNode {
    name: string;
    uuid: string;
    children: ItreeNode[];
    isLock: boolean; // 是否锁定
    depth?: number;
    isParent?: boolean; // 是否是父节点
    isExpand?: boolean; // 是否展开显示
    state?: string; // 状态
}