'use strict';

const fs = require('fs');
const ps = require('path');
const fse = require('fs-extra');
const ipc = require('@base/electron-base-ipc');
const project = require('./../../../../lib/project');
const dialog = require('./../../../../lib/dialog');
const profile = require('./../../../../lib/profile');
const setting = require('@editor/setting');

// 存放 dashboard 数据的 json 路径
const filePath = ps.join(setting.PATH.HOME, 'editor/dashboard.json');

if (!fse.existsSync(filePath)) {
    const obj = {recentProPath: ''};
    fse.writeJsonSync(filePath, obj, 'utf8');
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
    }
};

exports.methods = {

    /**
     * 从一个模版新建项目
     */
    createProject() {
        let template = this.list[this.activeIndex];
        project.create(this.directoryPath, template.path);
        project.add(this.type, this.directoryPath);
        project.open(this.directoryPath);
    },

    // 打开文件夹弹框
    chooseProSrc() {
        let that = this;
        dialog.openDirectory({ title: '选择项目路径'})
        .then((array) => {
            if (array && array[0]) {
                that.directoryPath = array[0] + '\\NewProject';
                dashProfile.set('recentProPath', array[0]);
                dashProfile.save();
            }
        });
    },
};

exports.mounted = function() {
    ipc
        .send('dashboard:getTemplate', this.type)
        .callback((error, templates) => {
            this.list = templates;
        });
    this.directoryPath = dashProfile.get('recentProPath') + '\\NewProject';
};
