interface IdragNode {
    from: string; // 被拖动的节点
    to: string; // 被指向的节点
    insert: string; // 插入方式，有三种：inside, before, after
}
interface ItreeNode {
    name: string;
    uuid: string;
    children?: ItreeNode[];
    depth?: number;
    isParent?: boolean; // 是否是父节点
    isExpand?: boolean; // 是否展开显示
    rename?: string; // 是否
}