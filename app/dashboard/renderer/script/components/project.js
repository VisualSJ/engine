'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const ps = require('path');

const project = require('@editor/project');
const ipc = require('@base/electron-base-ipc');

const dialog = require('./../../../../lib/dialog');
const { t } = require('./../util');

exports.template = fs.readFileSync(ps.join(__dirname, '../../template/project.html'), 'utf-8');

exports.props = [
    'type',
];

exports.data = function() {
    return {
        projects: [],
        opens: [],
        hover: null,
    };
};

exports.watch = {
    /**
     * 如果 type 更新，则使用新数据刷新页面
     */
    type() {
        this.projects = project.query({
            type: this.type,
        });
    },
};

exports.computed = {
    list() {
        return this.projects.map((item) => {
            // 添加一个用于显示的状态字段，默认为空，值为 ['', 'opened', deleting']
            item.state = this.opens.includes(item.path) ? 'opened' : '';
            return item;
        });
    },
};

exports.methods = {

    t,

    /**
     * 从列表内删除一个项目
     * @param {*} item
     */
    async removeProject(item) {
        const { path } = item; // 项目路径

        if (!path) {
            return false;
        }

        if (this.opens.includes(path)) {
            await dialog.show({
                type: 'warning',
                title: t('warn'),
                message: t('delete_project_close_first'),
                buttons: ['Cancel'],
            });
            return false;
        }

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
                item.state = 'deleting';
                project.remove(path);
                fse.removeSync(path);
                break;
            case 0:
                item.state = 'deleting';
                project.remove(path);
        }
    },

    /**
     * 打开一个项目
     * @param {*} path 项目路径，如果打开新项目，则传入空值
     */
    async openProject(path) {
        if (!path) {
            const array = await dialog.openDirectory({ title: t('open_project') });
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
        this.projects = project.query({
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

    // 更新列表中的项目打开状态
    ipc.on('dashboard:update-opens', (event, data) => {
        this.opens = data.opens;
    });
    ipc.send('dashboard:get-opens');
};
