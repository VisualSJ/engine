// set-property 消息的 options 定义
interface SetPropertyOptions {
    uuid: string; // 修改属性的对象的 uuid
    path: string; // 属性挂载对象的搜索路径
    // key: string; // 属性的 key
    dump: PropertyDump; // 属性 dump 出来的数据
}

// insert-array-element 消息的 options 定义
interface InsertArrayOptions {
    uuid: string; // 修改属性对象的 uuid
    path: string; // 修改的对象与 uuid 指向对象间的搜索路径 - 'comps/0'
    key: string; // 修改对象上的某个值的 key - 'colors'
    index: number; // 修改 item 在数组内的 index
    dump: PropertyDump; // 该数据的 dump 信息
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
    name: string;
    components?: string[];
    dump?: NodeDump;
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

interface NodeDump {
    uuid: PropertyDump;

    parent: PropertyDump;
    active: PropertyDump;
    name: PropertyDump;
    layer: PropertyDump;
    lpos: PropertyDump;
    lrot: PropertyDump;

    comps: PropertyDump;

    children: PropertyDump;
    [index: string]: PropertyDump;
}

interface PropertyDump {
    type: string;
    value: any;
    extends: string[];
    default?: any;
    options?: [];
    [index: string]: any;
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