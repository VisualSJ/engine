'use strict';

module.exports = {
    title: '偏好设置',
    nav: {
        gneneral: '通用设置',
        dataEditor: '编辑器',
        nativeDevelop: '默认浏览器',
        previewRun: '预览模拟器'
    },
    gneneral: {
        treeState: {
            option: ['全部展开', '全部折叠', '记住上一次状态'],
            label: '默认层级管理器节点折叠状态'
        },
        theme: {
            option: ['默认'],
            label: '皮肤主题'
        },
        language: {
            option: ['English', '中文'],
            label: '切换语言'
        },
        ipAdress: {
            option: ['自动', '192.168.52.11'],
            label: '选择本机 IP 地址'
        },
        showBuildLog: {
            label: '构建日志是否在控制台显示'
        },
        step: {
            label: '数值调节钮步长'
        },
        showDialog: {
            label: 'meta 文件备份时显示确认框'
        },
        autoTrim: {
            label: '导入图片时自动剪裁'
        }
    }
};
