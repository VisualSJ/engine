'use strict';

const fs = require('fs');
const ps = require('path');
const fse = require('fs-extra');
const project = require('@editor/project');
const dialog = require('./../../../../lib/dialog');
const profile = require('./../../../../lib/profile');
const setting = require('@editor/setting');
const {getName, t} = require('./../util');
// 存放 dashboard 数据的 json 路径
const filePath = ps.join(setting.PATH.HOME, 'editor/dashboard.json');

if (!fse.existsSync(filePath)) {
    const obj = {recentProPath: ps.join(setting.PATH.APP, './../')};
    fse.outputJSONSync(filePath, obj, 'utf8');
}
const dashProfile = profile.load('profile://global/editor/dashboard.json');

exports.template = fs.readFileSync(ps.join(__dirname, '../../template/template.html'), 'utf-8');

exports.props = [
    'type',
];

exports.data = function() {
    return {
        list: [],
        activeIndex: 0,
        directoryPath: '', // 存储input选择的路径
    };
};

exports.watch = {
    /**
     * 如果 type 更新，则使用新数据刷新页面
     */
    type() {

    },
};

exports.methods = {
    t,

    /**
     * 从一个模版新建项目
     */
    createProject() {
        let template = this.list[this.activeIndex];
        // 规范化路径
        let path = ps.normalize(this.directoryPath);
        if (!fs.existsSync(path)) {
            fse.ensureDirSync(path);
        } else if (!this.isEmptyDir(path)) {
            dialog.show({
                type: 'warning',
                title: t('warn'),
                message: t('message.duplicate_project'),
                buttons: ['直接覆盖同名文件', '重新选择路径'],
            }).then((index) => {
                if (index === 0) {
                    // 复制文件夹
                    fse.copySync(template.path, path);
                    project.open(path);
                }
            });
            return;
        }

        // 复制文件夹
        fse.copySync(template.path, path);

        // 打开项目
        project.open(path);
    },

    // 打开文件夹弹框
    chooseProSrc() {
        let that = this;
        dialog.openDirectory({ title: '选择项目路径'})
            .then((array) => {
                if (array && array[0]) {
                    let path = ps.join(array[0] , 'NewProject');
                    that.directoryPath = getName(path);
                    dashProfile.set('recentProPath', array[0]);
                    dashProfile.save();
                }
            });
    },

    /**
     * 检测新建文件夹目录是否为空
     * @param {*} path
     */
    isEmptyDir(path) {
        let files = fs.readdirSync(path);
        return !files || !files.length;
    },

    /**
     * 更新最近选择路径
     */
    updatedRecProPath() {
        if (!dashProfile.get('recentProPath') || !fse.existsSync(filePath)) {
            dashProfile.set('recentProPath', ps.join(setting.PATH.APP, './../'));
            dashProfile.save();
        }
        let path = getName(ps.join(dashProfile.get('recentProPath'), 'NewProject'));
        this.directoryPath = path;
    },

    /**
     * 更新模版列表
     */
    updateList() {
        this.list.push({
            name: 'empty',
            path: ps.join(__dirname, `../../../static/${this.type}-template/empty`),
        });
    },
};

exports.mounted = function() {
    this.updateList();
    this.updatedRecProPath();
};
