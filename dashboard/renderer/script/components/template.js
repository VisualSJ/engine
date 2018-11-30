'use strict';

const fs = require('fs');
const ps = require('path');
const fse = require('fs-extra');
const ipc = require('@base/electron-base-ipc');
const project = require('./../../../../lib/project');
const dialog = require('./../../../../lib/dialog');
const profile = require('./../../../../lib/profile');
const setting = require('@editor/setting');
const {getName} = require('./../util');
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
        ipc
            .send('dashboard:getTemplate', this.type)
            .callback((error, templates) => {
                this.list = templates;
            });
    },
};

exports.methods = {

    /**
     * 从一个模版新建项目
     */
    createProject() {
        let template = this.list[this.activeIndex];
        if (!this.isEmptyDir(this.directoryPath)) {
            dialog.show({
                type: 'warning',
                title: '警告',
                message: '该文件夹内已存在文件',
                buttons: ['直接覆盖同名文件', '重新选择路径'],
            }).then((array) => {
                if (array[0] === 0) {
                    project.create(this.directoryPath, template.path);
                    project.open(this.directoryPath);
                }
            });
        }
        project.create(this.directoryPath, template.path);
        project.open(this.directoryPath);
    },

    // 打开文件夹弹框
    chooseProSrc() {
        let that = this;
        dialog.openDirectory({ title: '选择项目路径'})
        .then((array) => {
            if (array && array[0]) {
                let path = array[0] + '\\NewProject';
                that.directoryPath = getName(path);
                dashProfile.set('recentProPath', array[0]);
                dashProfile.save();
            }
        });
    },

    /**
     * 检测当前文件夹是否为空
     * @param {*} path
     */
    isEmptyDir(path) {
        let files = fs.readdirSync(ps.dirname(path));
        return !files || !files.length;
    },
};

exports.mounted = function() {
    ipc
        .send('dashboard:getTemplate', this.type)
        .callback((error, templates) => {
            this.list = templates;
        });
    if (!dashProfile.get('recentProPath') || !fse.existsSync(filePath)) {
        dashProfile.set('recentProPath', ps.join(setting.PATH.APP, './../'));
        dashProfile.save();
    }
    let path = getName(ps.join(dashProfile.get('recentProPath'), '/NewProject'));
    this.directoryPath = path;
};
