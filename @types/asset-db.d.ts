declare interface IruntimeResource {
    name: string; // 用户可配置
    path?: string; // 用户可配置

    target: string; // db 文件夹绝对路径，用户不需要配置此字段
}
