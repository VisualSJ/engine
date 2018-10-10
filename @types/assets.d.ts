declare interface IdragAsset {
    from: string; // 被拖动的节点
    to: string; // 被指向的节点
    insert: string; // 插入方式，有三种：inside, before, after
    files?: string[]; 
}

declare interface IaddAsset {
    ext: string; // 新文件的后缀，文件夹为 folder
    name: string;
    value: string;
}

declare interface ItreeAsset {
    files: Array<string>; // 来自 assets-db 查询数据的字段
    importer: string;
    isDirectory: boolean;
    source: string;
    subAssets: any;
    uuid: string;

    protocol: string; // url 的 protocol 带有两斜杆
    hostname: string; // url 的 host
    host: string; // 带有 protocol + hostname
    pathname: string; // url 的 pathname, 含文件名
    dirname: string; // path 的 dir 去掉 protocol 和 hostname
    name: string; // path 的 base 即包含后缀
    ext: string; // path 的 ext
    filename: string; // path 的 name
    fileext: string; // path 的 ext 去掉点号
    parentSource: string; // 父级的 source
    parentUuid: string; // 父级的 uuid
    topSource: string; // 顶层父级的 source，如 db://assets/
    isExpand: boolean; // 是否展开显示
    isParent: boolean; // 是否是父节点
    isSubAsset: boolean; // 是否是 subAsset, 是的话：无右击菜单，可拖动到 scene 或 hierarchy, 但 asset 面板里面的不能移动
    thumbnail: string, // 图片缩略图的 base64 地址
    icon: string, // 文件图标
    state: string; // 状态: ['', 'input', 'loading']
    invalid: boolean; // 是否可用，原始数据中缺少 uuid 的都属于不可用 
    readonly: boolean; // 是否只读，一般是根节点，db://assets/ 级别，可以选中和粘贴，其他的操作不允许，如重名命，删除，拖拽
    depth: number; // 树形层级
    top: number; // top 位置
    _height: number; // 整个节点包括children的高度
    height: number; // 整个节点包括children的高度
    children: ItreeAsset[];
}
