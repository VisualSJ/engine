'use strict';

module.exports = {
    title: '资源管理器',

    menu: {
        createMenu: '打开新建资源菜单',
        searchPlaceholder_name: '搜索名称...', // 下划线表示后面接的是参数
        searchPlaceholder_uuid: '搜索 UUID...',
        searchPlaceholder_type: '搜索类型...',
        search: '搜索',
        searchName: '搜索名称',
        searchUuid: '搜索 UUID',
        searchType: '搜索类型',
        sort: '排序',
        sortName: '按名称排序',
        sortExtension: '按类型排序',
        refresh: '刷新',
        allExpand: '全部展开',
        allCollapse: '全部折叠',

        new: '新建',
        newFile: '文件',
        newFolder: '文件夹',
        newJavaScript: 'JavaScript',
        newTypeScript: 'TypeScript',
        newCubeMap: 'CubeMap',
        newScene: '场景文件',
        newMaterial: 'Material',
        newPhysicsMaterial: 'Physics Material',
        newEffect: 'Effect',
        newAnimation: 'Animation',
        copy: '复制',
        paste: '粘贴',
        delete: '删除',
        rename: '重命名',
        readonly: '只读',
        revealInlibrary: '在 Library 中显示',
        reimport: '重新导入资源',
        revealInExplorer: '在文件目录中显示',
        showUuid: '显示资源 UUID 和路径',
    },

    operate: {
        dialogError: '错误',
        dialogWaining: '警告',
        dialogQuestion: '确认',
        dialogInfo: '提示',
        refreshing: '正在更新资源...',
        sureDelete: '确定删除资源文件吗？',
        renameFail: '重命名失败：已存在相同名称的文件',
        pasteFail_parent_into_child: '父级资源不能粘贴到其子集资源里',
        refreshFail: '刷新 Assets 但返回了空数据',
        readDefaultFileFail: 'Internal DB 里缺少该类型的默认文件',
        errorNewnameDuplicate: '同级下的文件名称已存在，请选择其他名称',
        errorNewnameUnlegal: '文件名称含有不合法字符',
        errorNewnameEmpty: '名称不能为空',
        errorScriptName: '脚本文件名称不能以数字开头且不能与现有脚本文件重名',
    },

    deprecate: {
        fire: '.fire 文件已废弃，请将文件另存为 .scene 文件',
    },
};
