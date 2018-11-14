'use strict';

const fs = require('fs');
const fse = require('fs-extra');
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
    removeProject(path) {
        project.remove(path);
    },

    /**
     * 打开一个项目
     * @param {*} event
     * @param {*} path 项目路径，如果打开新项目，则传入空值
     */
    openProject(event, path) {
        if (path) {
            // 判断路径是否存在,不存在则提示并从项目管理器中删除
            if (!fs.existsSync(path)) {
                alert(`${path} is not exists`);
                this.removeProject(path);
                return;
            }
            project.open(path);
            return;
        }
        const that = this;
        dialog.openDirectory({title: '打开项目'}).then((array) => {
            if (!array || !array[0]) {
                return;
            }
            const path = array[0];
            const pkgJsonFile = ps.join(path, 'package.json');
            if (!fs.existsSync(pkgJsonFile)) {
                // todo toast 提示
                const projectJson = fse.readJSONSync(ps.join(path, 'project.json'));
                fse.outputJSONSync(pkgJsonFile, {
                    type: projectJson.engine.includes('3d') ? '3d' : '2d',
                }, { spaces: 2, });
            }
            const pkgJson = fse.readJSONSync(pkgJsonFile);

            if (!pkgJson.type && pkgJson.engine) {
                pkgJson.type = pkgJson.engine.includes('3d') ? '3d' : '2d';
            }

            // 判断当前打开项目与选择的 type 是否匹配
            if (that.type && that.type !== pkgJson.type) {
                // todo 提示错误
                alert(`This project is not a ${that.type} project`);
                return;
            }
            project.open(path);
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

    /**
     * 更新当前项目信息
     */
    updateProjects() {
        this.list = project.getList({
            type: this.type,
        });
    }
};

exports.mounted = function() {
    let that = this;
    that.updateProjects();
    // 监听项目内容更新，刷新列表
    project.on('update', () => {
        that.updateProjects();
    });
};
