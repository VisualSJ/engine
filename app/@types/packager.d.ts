declare interface IonePackage {
    name: string, // 名称
    type: string, // 类型 internal, global, project 内置 全局 项目
    path: string, // 磁盘路径
    info: any, // 插件说明
    enable: boolean, // 是否启用，具体到项目
    invalid: boolean, // 是否可用，指的是全局下是否已安装
    pkg?: any, // 配置数据
}
declare interface IaddPackage {

}

