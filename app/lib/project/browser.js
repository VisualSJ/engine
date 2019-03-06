'use strict';

const ps = require('path');
const fse = require('fs-extra');
const setting = require('@editor/setting');
const ipc = require('@base/electron-base-ipc');
const project = require('@editor/project');

const dialog = require('../dialog');
const i18n = require('../i18n');

const configFile = ps.join(setting.PATH.HOME, 'editor/project.json');

function save() {
    const json = project.dump();
    fse.outputJSONSync(configFile, json, {
        spaces: 2,
    });
    ipc.broadcast('editor3d-lib-project:update');
}

/**
 * 验证项目信息是否正确有效，并返回正确的列表信息
 * @param { object } data 保存在 json 内部的项目信息
 * @returns
 */
function checkProjectJson(data) {
    // 验证保存的项目信息是否依然有效
    data.projects && data.projects.forEach((item, index) => {
        if (!fse.existsSync(item.path)) {
            data.projects.splice(index, 1);
        }
    });
    return data;
}

// 初始化之前的数据
(() => {
    if (!fse.existsSync(configFile)) {
        return;
    }
    let json = fse.readJsonSync(configFile);
    json = checkProjectJson(json);
    // 初始化时重新调整存储的 json 文件数据
    fse.outputJSONSync(configFile, json);
    project.init(json);
})();

// 如果项目管理数据修改，则保存文件
project
    .on('add', save)
    .on('remove', save)
    .on('open', save);

class ProjectManager {

    constructor() {
        this._path = null;
        this._type = null;

        // 设置打开项目方法
        project.setOpenHandler((path) => {
            if (!process.send) {
                return dialog.show({
                    title: 'Error',
                    message: 'Project warnning',
                    detail: i18n.t('menu.dashboard_missing'),
                    type: 'warn',

                    defaultId: 0,
                    cancelId: 0,

                    buttons: ['Cancel'],
                });
            }
            process.send({
                channel: 'open-project',
                path,
            });
        });

        const pkgJsonFile = ps.join(setting.PATH.PROJECT, 'package.json');

        // 如果项目的 json 文件不存在，应该提示错误并关闭进程
        if (!fse.existsSync(pkgJsonFile)) {
            const projectJsonFile = ps.join(setting.PATH.PROJECT, 'project.json');
            if (!fse.existsSync(projectJsonFile)) {
                return console.warn(`Can't find the package.json.`);
            }
            const projectJson = fse.readJSONSync(projectJsonFile);
            fse.outputJSONSync(pkgJsonFile, {
                type: projectJson.engine.includes('3d') ? '3d' : '2d',
            }, { spaces: 2 });
        }

        const pkgJson = fse.readJSONSync(pkgJsonFile);

        if (!pkgJson.type && pkgJson.engine) {
            console.warn();
            pkgJson.type = pkgJson.engine.includes('3d') ? '3d' : '2d';
        }

        // 如果项目配置不合法，应该提示并关闭进程
        if (pkgJson.type && ['2d', '3d'].indexOf(pkgJson.type) === -1) {
            // todo 提示错误
            return;
        }

        this._path = setting.PATH.PROJECT;
        this._type = pkgJson.type;

        if (!this._type && pkgJson.engine) {
            pkgJson.engine.includes('3d');
        }
    }

    // 当前项目的路径，如无，则为 null
    get path() {
        return this._path;
    }

    // 当前项目的临时文件夹
    get tmpDir() {
        if (!this._path) {
            return null;
        }
        const dir = ps.join(this._path, 'temp');
        fse.ensureDirSync(dir);
        return dir;
    }

    // 当前项目的类型，如无，则为 null
    get type() {
        return this._type;
    }

    /**
     * 新建项目
     */
    create() {
        if (!process.send) {
            return dialog.show({
                title: 'Error',
                message: 'Project warnning',
                detail: i18n.t('menu.dashboard_missing'),
                type: 'warn',

                defaultId: 0,
                cancelId: 0,

                buttons: ['Cancel'],
            });
        }
        process.send({
            channel: 'show-dashboard',
            options: {
                tab: 1,
                type: this._type,
            },
        });
    }

    /**
     * 打开项目
     * @param {string} path 项目路径
     */
    open(path) {
        if (!process.send) {
            return dialog.show({
                title: 'Error',
                message: 'Project warnning',
                detail: i18n.t('menu.dashboard_missing'),
                type: 'warn',

                defaultId: 0,
                cancelId: 0,

                buttons: ['Cancel'],
            });
        }
        process.send({
            channel: 'open-project',
            options: {
                path,
                tab: 0,
                type: this._type,
            },
        });
    }

    /**
     * 新增项目
     * @param {*} path
     */
    add(path) {
        // 新增项目
        project.add(path);
    }

    /**
     * 检测项目路径是否已存在
     * @param {*} path
     * @memberof ProjectManager
     */
    isPathExist(path) {
        let list = this.getList() || [];
        let isPathExist = list.find((item) => {
            return item.path === path;
        });
        return isPathExist;
    }
}

module.exports = new ProjectManager();

// 页面进程调用主进程的方法
ipc.on('editor3d-lib-project:call', (event, name, ...args) => {
    return module.exports[name](...args);
});
