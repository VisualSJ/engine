'use strict';

const ps = require('path');
const fse = require('fs-extra');
const ipc = require('@base/electron-base-ipc');
const setting = require('@editor/setting');
const EventEmitter = require('events').EventEmitter;
class ProjectManager extends EventEmitter {

    constructor() {
        super();
        this._path = null;
        this._type = null;

        // 如果没有打开任何项目
        if (!setting.PATH.PROJECT) {
            return;
        }

        const pkgJsonFile = ps.join(setting.PATH.PROJECT, 'package.json');

        // 如果项目的 json 文件不存在，应该提示错误并关闭进程
        if (!fse.existsSync(pkgJsonFile)) {
            // todo 提示错误
            return;
        }

        const pkgJson = fse.readJSONSync(pkgJsonFile);

        // 如果项目配置不合法，应该提示并关闭进程
        if (['2d', '3d'].indexOf(pkgJson.type) === -1) {
            // todo 提示错误
            return;
        }

        this._path = setting.PATH.PROJECT;
        this._type = pkgJson.type;
    }

    // 当前项目的路径，如无，则为 null
    get path() {
        return this._path;
    }

    // 当前项目的类型，如无，则为 null
    get type() {
        return this._type;
    }

    /**
     * 创建项目
     * 根据存储路径，模板路径，创建项目
     * @param {*} path 保存在的位置
     * @param {*} template 项目模版路径
     * @param {*} name 项目名称
     */
    create(path, template) {
        ipc.send('editor3d-lib-project:call', 'create', path, template, name);
    }

    /**
     * 删除项目
     * @param {*} path
     */
    remove(path) {
        ipc.send('editor3d-lib-project:call', 'remove', path);
    }

    /**
     * 打开项目
     * @param {*} path 项目路径
     */
    open(path) {
        ipc.send('editor3d-lib-project:call', 'open', path);
    }

    /**
     * 新增项目
     * @param {*} path 项目路径
     */
    add(path) {
        ipc.send('editor3d-lib-project:call', 'add', path);
    }

    /**
     * 查询项目
     * @param {*} option
     *   {
     *     sort: 'otime', // otime 打开时间 | ctime 创建时间 | name 名称
     *     order: 'desc', // desc 从大到小 | asc 从小到大
     *     type: '2d'
     *   }
     */
    getList(option) {
        return ipc.sendSync('editor3d-lib-project:call', 'getList', option);
    }

    /**
     * 检测项目路径是否已存在
     * @param {*} path
     */
    isPathExist(path) {
        return ipc.sendSync('editor3d-lib-project:call', 'isPathExist', path);
    }

    /**
     * 触发 update 事件
     * @memberof ProjectManager
     */
    emitUpdate() {
        this.emit('update');
    }
}

module.exports = new ProjectManager();

// 页面进程调用主进程的方法
ipc.on('editor3d-lib-project:update', (event) => {
    module.exports.emitUpdate();
});
