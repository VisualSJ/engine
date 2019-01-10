'use strict';

const ps = require('path');
const fse = require('fs-extra');
const { spawn } = require('child_process');
const setting = require('@editor/setting');
const ipc = require('@base/electron-base-ipc');
const project = require('@editor/project');
const { app } = require('electron');
const dialog = require('../dialog');

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
        this._templates = {
            '2d': [],
            '3d': [],
        };

        this.registerTemplate(ps.join(__dirname, './static/template/empty-2d'));
        this.registerTemplate(ps.join(__dirname, './static/template/empty-3d'));

        this._path = null;
        this._type = null;

        // 如果没有打开任何项目
        if (!setting.PATH.PROJECT) {
            // 设置打开项目方法
            project.setOpenHandler((path) => {
                ipc.emit('editor3d-lib-project:open-project', path);
            });
            return;
        }

        // 设置打开项目方法
        project.setOpenHandler((path) => {
            if (!process.send) {
                throw new Error('Dashboard does not exist');
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

    /////////////////////////////
    // 模版管理

    /**
     * 将一个文件夹当作模版传递给 project 管理
     * @param {*} path 模版的地址
     */
    registerTemplate(path) {
        const pkgJsonFile = ps.join(path, 'package.json');

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

        this._templates[pkgJson.type].push({
            name: pkgJson.name,
            path,
        });
    }

    /**
     * 查询模版列表
     * @param {*} type 模版类型
     */
    getTemplate(type) {
        return JSON.parse(JSON.stringify(this._templates[type]));
    }

    /////////////////////////////
    // 项目管理

    /**
     * 创建项目
     * 根据存储路径，模板路径，创建项目
     * @param {*} path 保存在的位置
     * @param {*} template 项目模版路径
     * @param {*} name 项目名称
     */
    create(path, template, name) {
        // 模板文件不存在
        if (!fse.existsSync(template)) {
            throw new Error('Project template is not exists.');
        }

        if (!fse.existsSync(path)) {
            // todo 检测内部有无多余文件，或者该路径已在项目中
        }
        // 复制文件夹
        fse.copySync(template, path);

        // 未指定项目名字则使用文件夹名称
        if (!name) {
            name = ps.basename(path);
        }
        // 读取json文件
        let pkgJson;
        let pkgPath = ps.join(path, '/package.json');
        try {
            pkgJson = fse.readJSONSync(pkgPath);
        } catch (error) {
            console.warn(`read packge failed: ${pkgPath} read error.`);
            console.warn(error);
            return;
        }
        pkgJson.name = name;
        // 更改json文件
        fse.writeJsonSync(pkgPath, pkgJson, (error) => {
            console.warn(`write JSON ${pkgJson} failed!`);
            console.warn(error);
        });

        // 创建完成后加到项目管理内
        project.add(path);
    }

    /**
     * 删除项目
     * @param {*} path
     */
    remove(path) {
        project.remove(path);
    }

    /**
     * 打开项目
     * @param {string} path 项目路径
     */
    open(path) {
        if (!path) {
            dialog.openDirectory({ title: '打开项目' }).then((array) => {
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
                    }, { spaces: 2 });
                }
                const pkgJson = fse.readJSONSync(pkgJsonFile);

                if (!pkgJson.type && pkgJson.engine) {
                    pkgJson.type = pkgJson.engine.includes('3d') ? '3d' : '2d';
                }

                // 如果项目配置不合法，应该提示并关闭进程
                if (['2d', '3d'].indexOf(pkgJson.type) === -1) {
                    // todo 提示错误
                    dialog.show({
                        message: 'Project configuration is illegal',
                        type: 'warn',
                    });
                    return;
                }
                project.open(path);
            });
        } else {
            // 打开项目
            project.open(path);
        }
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
     * 查询项目
     * @param {*} option
     *   {
     *     sort: 'otime', // otime 打开时间 | ctime 创建时间 | name 名称
     *     order: 'desc', // desc 从大到小 | asc 从小到大
     *     type: '2d'
     *   }
     */
    getList(option) {
        let data = project.query(option);
        // 每次返回都需要重新验证文件列表内的信息是否正确
        return checkProjectJson(data);
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

// 打开的所有项目进程
const children = [];

// 打开项目
ipc.on('editor3d-lib-project:open-project', (event, path, type) => {
    // todo 检查 package.json 是否正确
    // electron 程序地址
    const exePath = app.getPath('exe');

    // 拼接参数
    const args = [ps.resolve()];
    if (setting.dev) {
        args.push('--dev');
        args.push('--remote-debugging-port=9223');
    }

    args.push('--project');
    args.push(path);

    // 实际启动
    const child = spawn(exePath, args, {
        stdio: [0, 1, 2, 'ipc'],
    });
    children.push(child);

    child.on('message', (options) => {
        if (options.channel && options.channel === `open-project`) {
            ipc.emit('editor3d-lib-project:open-project', options.path);
        }

        // 菜单项 新建项目
        if (options.channel && options.channel === `show-dashboard`) {
            global.dashboard && dashboard.show();
            ipc.broadcast('dashboard:set-options', options.options);
        }
    });

    child.on('exit', () => {
        const index = children.indexOf(child);
        children.splice(index, 1);

        if (children.length <= 0) {
            // 如果关闭最后一个项目，需要显示 dashboard(dashboard初始化时赋值)
            global.dashboard && dashboard.show();
            app.dock && app.dock.show();
        }
    });

    // 如果关闭最后一个项目，需要显示 dashboard(dashboard初始化时赋值)
    global.dashboard && dashboard.hide();
    app.dock && app.dock.hide();
});
