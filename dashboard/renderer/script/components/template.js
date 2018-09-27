'use strict';

const fs = require('fs');
const ps = require('path');

const ipc = require('@base/electron-base-ipc');
const project = require('./../../../../lib/project');
const dialog = require('./../../../../lib/dialog');

exports.template = fs.readFileSync(ps.join(__dirname, '../../template/template.html'), 'utf-8');

exports.props = [
    'type',
];

exports.data = function() {
    return {
        list: [],
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
     * @param {*} event
     * @param {*} template 模版路径
     */
    createProject(event, template) {
        if (!template) {
            return;
        }
        dialog.openDirectory({
            title: '新建项目',
            onOk(array) {
                if (!array || !array[0]) {
                    return;
                }
                project.create(array[0], template);
            }
        });
    }
};

exports.mounted = function() {
    ipc
        .send('dashboard:getTemplate', this.type)
        .callback((error, templates) => {
            this.list = templates;
        });
};
