declare interface IdragAsset {
    from: string; // 被拖动的节点
    to: string; // 被指向的节点
    insert: string; // 插入方式，有三种：inside, before, after
    files?: string[]; // 拖拽中带上外部系统文件
}

declare interface IaddAsset {
    ext: string; // 新文件的后缀，文件夹为 folder
    name: string; // 文件名称
    content: string; // 文件的内容
}

declare interface ItreeAsset {
    files: Array<string>; // 来自 assets-db 查询数据的字段
    importer: string;
    isDirectory: boolean;
    source: string;
    file: string; // 磁盘路径
    subAssets: any;
    uuid: string;
    readOnly: boolean; // 是否只读，不允许重名命，删除，拖拽，界面多一个锁图标
    visible: boolean; // 是否显示

    // 以下是扩展的数据
    name: string; // 文件名，包含后缀
    fileName: string; // 文件名，不包含后缀
    fileExt: string; // 后缀，不包含点好
    parentSource: string; // 父级的 source
    parentUuid: string; // 父级的 uuid
    topSource: string; // 顶层父级的 source，如 db://assets/
    isExpand: boolean; // 是否展开显示
    isParent: boolean; // 是否是父节点
    isRoot: boolean; // 是否是根节点，assets 这些
    isSubAsset: boolean; // 是否是 subAsset, 是的话：无右击菜单，可拖动到 scene 或 hierarchy, 但 asset 面板里面的不能移动
    state: string; // 状态: ['', 'input', 'loading']
    depth: number; // 树形层级
    top: number; // top 位置
    left: number; // 缩进的大小
    _height: number; // 整个节点包括children的高度
    height: number; // 整个节点包括children的高度
    children: ItreeAsset[];

}
