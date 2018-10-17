'use strict';

const fs = require('fs');
const ps = require('path');

const project = require('./../../../../lib/project');
const dialog = require('./../../../../lib/dialog');

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
        this.list = project.getList({
            type: this.type,
        });
    },
};

exports.methods = {
    /**
     * 从列表内删除一个项目
     * @param {*} event
     * @param {*} path 项目路径
     */
    removeProject(event, path) {
        project.remove(path);

        const vm = this;
        setTimeout(() => {
            vm.list = project.getList({
                type: vm.type,
            });
        }, 500);
    },

    /**
     * 打开一个项目
     * @param {*} event
     * @param {*} path 项目路径，如果打开新项目，则传入空值
     */
    openProject(event, path) {
        if (path) {
            project.open(path);
            return;
        }

        const vm = this;
        dialog.openDirectory({title: '打开项目'}).then((array) => {
            if (!array || !array[0]) {
                return;
            }
            const path = array[0];
            project.add(vm.type, path);
            project.open(path);

            setTimeout(() => {
                vm.list = project.getList({
                    type: vm.type,
                });
            }, 500);
        });
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
};

exports.mounted = function() {
    this.list = project.getList({
        type: this.type,
    });
};
