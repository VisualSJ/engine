declare interface IdragAsset {
    from: string; // 被拖动的节点
    to: string; // 被指向的节点
    insert: string; // 插入方式，有三种：inside, before, after
}

declare interface IaddAsset {
    type: string; // 一个节点的类型，默认空节点，值为 'empty'
    name: string;
    value: string;
}

declare interface ItreeAsset {
    pathname: string; // 来自 source 数据，去掉协议头 db://
    name: string;
    filename: string;
    fileext: string;
    children: ItreeAsset[];
    top: number; // top 位置
    _height?: number; // 整个节点包括children的高度
    height?: number; // 整个节点包括children的高度
    parent: string; // 它的父级的uuid
    isDirectory: boolean; // 是否是文件夹
    depth?: number;
    isParent?: boolean; // 是否是父节点
    isExpand?: boolean; // 是否展开显示
    state?: string; // 状态
    icon?: string,
    thumbnail?: string,

    files?: Array<string>; // 以下数据来自 assets-db 查询
    importer?: string;
    source?: string;
    uuid: string;

}

declare interface IsourceAsset {
    files: Array<string>;
    importer: string;
    source: string;

    thumbnail: string,
    pathname: string;
    name: string;
    filename: string;
    fileext: string;
    parent: string;
    isExpand: boolean;
}