'use strict';

export interface IProperty {
    value: { [key: string]: IProperty | IProperty[] | null | undefined | number | boolean | string } | null;
    default: any; // 默认值

    // name: string;
    type: string;
    readonly: boolean;
    visible: boolean;

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

    // multiline?: boolean; 字符串是否允许换行
    // nullable?: boolean; 属性是否允许为空
}

export interface INode {
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

export interface IScene {
    name: IProperty;
    active: IProperty;
    _globals: any;
    isScene: boolean;

    uuid: IProperty;
    children: any[];
    parent: any;
    __type__: string;
}
