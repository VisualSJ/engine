declare interface IdragNode {
    from: string; // 被拖动的节点
    to: string; // 被指向的节点
    insert: string; // 插入方式，有三种：inside, before, after
}

declare interface IaddNode {
    type: string; // 一个节点的类型，默认空节点，值为 'empty'
    name: string;
    value: string;
}

declare interface ItreeNode {
    name: string;
    uuid: string;
    children: ItreeNode[];
    top: number; // top 位置
    isLock: boolean; // 是否锁定
    depth?: number;
    isParent?: boolean; // 是否是父节点
    isExpand?: boolean; // 是否展开显示
    state?: string; // 状态
}
