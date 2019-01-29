declare const Manager: IManager;

// window 全局 Manager 变量
interface IManager {
    AssetInfo: IAssetWorkerInfo,
    AssetWorker: { [key: string]: any }
    serialize: Function;
}

declare interface IruntimeResource {
    name: string; // 用户可配置
    path?: string; // 用户可配置

    target: string; // db 文件夹绝对路径，用户不需要配置此字段
}

declare interface IAssetDBConfig {
    name: string;
    target: string;
    library: string;
    temp: string;
    visible: boolean;
    readOnly: boolean;
}

declare interface IAssetWorkerInfo {
    engine: string; // 引擎所在目录
    type: string; // 当前项目的类型 2d | 3d
    dist: string; // asset-db 目标目录（importer 等）
    utils: string; // 引擎的 utils 所在目录
}

declare interface IDatabaseInfo {
    name: string; // 数据库名字
    target: string; // 源目录地址
    library: string; // 导入数据地址
    temp: string; // 临时目录地址
    readOnly: boolean; // 是否只读
    visible: boolean; // 是否显示
}

declare interface IAssetInfo {
    name: string; // 资源名字
    source: string; // url 地址
    file: string; // 绝对路径
    uuid: string; // 资源的唯一 ID
    importer: string; // 使用的导入器名字
    type: string; // 类型
    isDirectory: boolean; // 是否是文件夹
    library: { [key: string]: string }; // 导入资源的 map
    subAssets: { [key: string]: IAssetInfo }; // 子资源 map
    visible: boolean; // 是否显示
    readOnly: boolean; // 是否只读
    redirect?: IRedirectInfo; // 跳转指向资源
}

declare interface IAsset {
    name: string; // 资源名字
    asset: any; // AssetDB 的资源
}

declare interface IRedirectInfo {
    type: string; // 跳转资源的类型
    uuid: string; // 跳转资源的 uuid
}

declare interface ICreateOption {
    src?: string; // 源文件地址，如果传入 content 为空，则复制这个指向的文件
}