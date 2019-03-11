'use strict';

module.exports = {
    mask: {
        loading: '正在加载资源...',
    },
    'debug-mode': '打开资源调试工具',

    operate: {
        dialogError: '错误',
        dialogWaining: '警告',
        dialogQuestion: '确认',
        dialogInfo: '提示',
    },

    createAsset: {
        fail: {
            unknown: '创建资源失败: 未知错误',
            url: '创建资源失败: 传入的地址无法识别',
            exist: '创建资源失败: 文件已经存在',
            drop: '创建资源失败: 导入的资源地址不存在',
            toUrl: '创建资源失败: 文件路径无法转为 url',
            uuid: '创建资源失败: 无法识别 url 的 uuid ',
            content: '创建资源失败: 文件内容格式不正确 ',
        },
        warn: {
            overwrite: '已存在相同的文件，是否覆盖？',
        },
    },

    saveAsset: {
        fail: {
            unknown: '保存资源失败: 未知错误',
            uuid: '保存资源失败: 无法识别 uuid ',
            content: '保存资源失败: 文件内容格式不正确 ',
        },
    },

    saveAssetMeta: {
        fail: {
            unknown: '保存资源 META 失败: 未知错误',
            uuid: '保存资源 META 失败: 无法识别 uuid ',
            content: '保存资源 META 失败: 文件内容格式不正确 ',
        },
    },

    copyAsset: {
        fail: {
            unknown: '复制资源失败: 未知错误',
            url: '复制资源失败: 参数不合法 ',
            source: '复制资源失败: 源地址不存在文件',
            target: '复制资源失败: 目标文件已经存在',
            include: '复制资源失败: 源地址不能被目标地址包含',
            parent: '复制资源失败: 目标地址的父级地址不正确',
            readonly: '复制资源失败: 目标地址的父级地址是只读，不可粘贴进文件',
        },
    },

    moveAsset: {
        fail: {
            unknown: '移动资源失败: 未知错误',
            url: '移动资源失败: 参数不合法 ',
            source: '移动资源失败: 源地址不存在文件',
            target: '移动资源失败: 目标地址不合法',
            exist: '移动资源失败: 目标地址已经存在相同的文件',
            include: '移动资源失败: 源地址不能被目标地址包含',
            parent: '移动资源失败: 目标地址的父级地址不正确',
            readonly: '移动资源失败: 目标地址的父级地址是只读，不可移入文件',
        },
    },

    deleteAsset: {
        fail: {
            unknown: '删除资源失败: 未知错误',
            url: '删除资源失败: 参数不合法 ',
            unexist: '删除资源失败: 文件不存在 ',
        },
    },
};
