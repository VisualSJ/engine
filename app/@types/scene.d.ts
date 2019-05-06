// set-property 消息的 options 定义
interface SetPropertyOptions {
    uuid: string; // 修改属性的对象的 uuid
    path: string; // 属性挂载对象的搜索路径
    // key: string; // 属性的 key
    dump: IProperty; // 属性 dump 出来的数据
}
interface CreatePropertyOptions {
    uuid: string; // 创建属性的对象的 uuid
    path: string; // 属性挂载对象的搜索路径
    type: string; // 属性的类型
}
interface ResetPropertyOptions {
    uuid: string; // 重置属性的对象的 uuid
    path: string; // 属性挂载对象的搜索路径
    type: string; // 属性的类型
}

// insert-array-element 消息的 options 定义
interface InsertArrayOptions {
    uuid: string; // 修改属性对象的 uuid
    path: string; // 修改的对象与 uuid 指向对象间的搜索路径 - 'comps/0'
    key: string; // 修改对象上的某个值的 key - 'colors'
    index: number; // 修改 item 在数组内的 index
    dump: IProperty; // 该数据的 dump 信息
}

// move-array-element 消息的 options 定义
interface MoveArrayOptions {
    uuid: string;
    path: string;
    target: number;
    offset: number;
}

// remove-array-element 消息的 options 定义
interface RemoveArrayOptions {
    uuid: string;
    path: string;
    index: number;
}

// create-node 消息的 options 定义
interface CreateNodeOptions {
    parent: string;
    components?: string[];

    name?: string;
    dump?: INode | IScene; // node 初始化应用的数据
    assetUuid?: string; // 如果发送了资源 id，则从资源内创建对应的节点
}

interface RemoveNodeOptions {
    uuid: string;
}

interface CreateComponentOptions {
    uuid: string;
    component: string;
}

interface RemoveComponentOptions {
    uuid: string;
    component: string;
}

interface ExcuteComponentMethodOptions {
    uuid: string;
    name: string;
    args: any[];
}

interface IProperty {
    value: { [key: string]: IProperty | IProperty[] | null | undefined | number | boolean | string } | null | undefined;
    default: any; // 默认值

    // 多选节点之后，这里存储多个数据
    values?: ({ [key: string]: IProperty | IProperty[] | null | undefined | number | boolean | string } | null | undefined)[];

    // name: string;
    type: string;
    readonly: boolean;
    visible: boolean;

    path?: string; // 数据的搜索路径，这个是由使用方填充的

    isArray?: boolean;
    invalid?: boolean;
    extends?: string[]; // 继承链
    displayName?: string; // 显示到界面上的名字
    displayOrder?: number; // 显示排序
    tooltip?: string; // 提示文本
    editor?: any; // 组件上定义的编辑器数据
    animatable?: boolean; // 是否可以在动画中编辑

    // Enum
    enumList?: any[]; // enum 类型的 list 选项数组

    // Number
    min?: number; // 数值类型的最小值
    max?: number; // 数值类型的最大值
    step?: number; // 数值类型的步进值
    slide?: boolean; // 数组是否显示为滑块
    unit?: string; // 显示的单位

    // Label
    multiline?: boolean; // 字符串是否允许换行
    // nullable?: boolean; 属性是否允许为空
}

interface INode {
    active: IProperty;
    name: IProperty;
    position: IProperty;
    rotation: IProperty;
    scale: IProperty;
    uuid: IProperty;

    children: any[];
    parent: any;

    __comps__: IProperty[];
    __type__: string;
    __prefab__?: any;
}

interface IScene {
    name: IProperty;
    active: IProperty;
    _globals: any;
    isScene: boolean;

    uuid: IProperty;
    children: any[];
    parent: any;
    __type__: string;
}


interface NodeTreeItem {
    name: string;
    uuid: string;
    children: NodeTreeItem[];
}

interface vec2 {
    x: number;
    y: number;
}

interface vec3 {
    x: number;
    y: number;
    z: number;
}

interface vec4 {
    x: number;
    y: number;
    z: number;
    w: number;
}

interface quat {
    x: number;
    y: number;
    z: number;
    w: number;
}

interface color3 {
    r: number;
    g: number;
    b: number;
}

interface color4 {
    r: number;
    g: number;
    b: number;
    a: number;
}

interface mat3 {
    m00: number;
    m01: number;
    m02: number;

    m03: number;
    m04: number;
    m05: number;

    m06: number;
    m07: number;
    m08: number;
}

interface mat4 {
    m00: number;
    m01: number;
    m02: number;
    m03: number;

    m04: number;
    m05: number;
    m06: number;
    m07: number;

    m08: number;
    m09: number;
    m10: number;
    m11: number;

    m12: number;
    m13: number;
    m14: number;
    m15: number;
}

// asset | rect | entity | component

// history.ts 使用，历史操作记录
declare interface IhistoryStep {
    time: string; // 记录时间
    to: string; // 被指向的节点
    insert: string; // 插入方式，有三种：inside, before, after
    files?: string[]; // 拖拽中带上外部系统文件
}

interface IquerySerializedMaterialOptions {
    effectName: string;
    _props: any;
    _defines: any;
}
