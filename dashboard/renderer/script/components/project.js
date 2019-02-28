'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const ps = require('path');

const project = require('@editor/project');

const dialog = require('./../../../../lib/dialog');
const { t } = require('./../util');

exports.template = fs.readFileSync(ps.join(__dirname, '../../template/project.html'), 'utf-8');

exports.props = [
    'type',
];

exports.data = function() {
    return {
        list: [],
        hover: null,
    };
};

exports.watch = {
    /**
     * 如果 type 更新，则使用新数据刷新页面
     */
    type() {
        this.list = project.query({
            type: this.type,
        });
    },
};

exports.methods = {

    t,

    /**
     * 从列表内删除一个项目
     * @param {*} event
     * @param {*} path 项目路径
     */
    async removeProject(path) {
        const isDelete = await dialog.show({
            type: 'info',
            title: t('delete_project'),
            message: t('delete_project'),
            detail: path,
            buttons: [t('message.delete_project_record'), t('message.delete_project_source'), t('cancel')],
            default: 2,
            cancel: 2,
        });

        switch (isDelete) {
            case 2:
                break;
            case 1:
                project.remove(path);
                fse.removeSync(path);
                break;
            case 0:
                project.remove(path);
        }
    },

    /**
     * 打开一个项目
     * @param {*} event
     * @param {*} path 项目路径，如果打开新项目，则传入空值
     */
    async openProject(event, path) {
        // 如果没传入 path，则弹窗补全
        if (!path) {
            const array = await dialog.openDirectory({title: t('open_project')});
            if (!array || !array[0]) {
                return;
            }
            path = array[0];
        }

        // 判断路径是否存在,不存在则提示并从项目管理器中删除
        if (!fs.existsSync(path)) {
            const result = await dialog.show({
                type: 'warn',
                title: t('project_missing'),
                message: t('message.project_missing'),
                buttons: [t('cancel'), t('remove')],
            });
            if (result === 1) {
                project.remove(path);
            }
            return;
        }

        // 实际打开流程
        project.open(path);
    },

    /**
     * 时间戳转时间
     */
    stamp2time(stamp) {
        let time = new Date(stamp);
        return `${time.toLocaleDateString()} ${time.toLocaleTimeString()}`;
    },

    /**
     * 鼠标移入某个项目
     * @param {*} event
     * @param {*} item
     */
    _onMouseEnter(event, item) {
        this.hover = item;
    },

    /**
     * 鼠标移出某个项目
     * @param {*} event
     */
    _onMouseLeave(event) {
        this.hover = null;
    },

    /**
     * 更新当前项目信息
     */
    updateProjects() {
        this.list = project.query({
            type: this.type,
        });
    },
};

exports.mounted = function() {
    const update = () => {
        this.updateProjects();
    };
    update();

    // 监听项目内容更新，刷新列表
    project
        .on('add', update)
        .on('remove', update)
        .on('open', update);
};
