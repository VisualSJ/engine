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
        refresh: '刷新',
        refresh: '刷新',
        allExpand: '全部展开',
        allCollapse: '全部折叠',

        new: '新建',
        newFolder: '文件夹',
        newJavaScript: 'JavaScript',
        newTypeScript: 'TypeScript',
        newCoffeeScript: 'CoffeeScript',
        newScene: 'Scene',
        newAnimationClip: 'Animation Clip',
        newAutoAtlas: 'Auto Atlas',
        newLabelAtlas: 'Label Atlas',
        newMaterials: 'Materials',
        newEffect: 'Effect',
        copy: '复制',
        paste: '粘贴',
        delete: '删除',
        rename: '重命名',
        revealInlibrary: '在 Library 中显示',
        revealInExplorer: '在文件目录中显示',
        showUuid: '显示资源 UUID 和路径',
    },

    operate: {
        sureDelete: '确定删除资源文件吗？',
        renameFail: '重命名失败',
        copyFail: '资源不能被复制',
        addFail: '新建资源失败',
        dropFileFail: '导入资源失败',
        deleteFail: '删除资源失败',
        moveFail: '移动资源失败',
        moveFail_parent_into_child: '父级资源不能移动到其子集资源里',
        pasteFail: '复制资源失败',
        pasteFail_parent_into_child: '父级资源不能粘贴到其子集资源里',
    },
};
