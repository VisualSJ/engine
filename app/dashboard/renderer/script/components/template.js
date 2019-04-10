'use strict';

const fs = require('fs');
const ps = require('path');
const fse = require('fs-extra');
const project = require('@editor/project');
const dialog = require('./../../../../lib/dialog');
const profile = require('./../../../../lib/profile');
const setting = require('@editor/setting');
const { getName, t } = require('./../util');
// 存放 dashboard 数据的 json 路径
const filePath = ps.join(setting.PATH.HOME, 'editor/dashboard.json');

if (!fse.existsSync(filePath)) {
    const obj = { recentProPath: ps.join(setting.PATH.APP, './../') };
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
                buttons: ['Cancel'],
            });
            return;
        }
        // 复制文件夹
        fse.copySync(template.path, path);
        updateProjectName(path);

        // 打开项目
        project.open(path);

        // 更新默认地址
        this.updatedRecProPath();
    },

    // 打开文件夹弹框
    chooseProSrc() {
        let that = this;
        dialog.openDirectory({
            title: this.t('template.select_project'),
            root: this.directoryPath,
        }).then((array) => {
            if (array && array[0]) {
                that.directoryPath = array[0];
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
        let path = getName(dashProfile.get('recentProPath'));
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

/**
 * 更新项目名称
 * @param {*} path
 */
function updateProjectName(path) {
    try {
        const pkg = fse.readJSONSync(ps.join(path, 'package.json'));
        pkg.name = ps.basename(path);
        fse.outputJSONSync(ps.join(path, 'package.json'), pkg);
    } catch (error) {
        console.error(`Rename project failed! ${error.message}`);
    }
}

exports.mounted = function() {
    this.updateList();
    this.updatedRecProPath();
};
