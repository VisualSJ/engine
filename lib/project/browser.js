'use strict';

const ps = require('path');
const fse = require('fs-extra');
// const unzip = require('unzip');
const setting = require('@editor/setting');

const configFile = ps.join(setting.PATH.HOME, 'editor/project.json');

// TODO 这段代码本意是容错处理，但如果指定的项目路径是不存在，仍会创建目录，这点对用户不友好；有待后续处理
fse.ensureDirSync(setting.PATH.PROJECT);

class ProjectManager {

    get path() {
        return setting.PATH.PROJECT;
    };

    get type() {
        const project = this.getInfo(this.path);
        return project.type;
    };

    /**
     * 创建项目, 复制项目
     * 根据存储路径，模板路径，创建项目
     * @param path 保存在的位置
     * @param template 项目路径 或者 '2d' 或者 '3d' 
     */
    create(path, template) {
        /**
         * info 一个空项目的基本配置信息
         * 保存到项目的数据不合适含有 name 和 path, 
         * 因为项目 name 跟路径 path 的最后一节 dir 有关，
         * 而 path 容易被外部移动或修改
         * 
         * 但是在 getInfo() 环节返回的数据会把 name 和 path 补上
         */
        let info = {
            type: '', // 类型 2d 或 3d
            template: '' // 是否复用了模板 或 其他项目，保存这个项目地址
        };

        // 不使用模板
        if (['2d', '3d'].includes(template)) { // 只给定一个项目类型，属于全新创建
            fse.outputJsonSync(ps.join(path, 'package.json'), info);
            return info;
        }

        // 使用模板
        if (fse.existsSync(template) === false) { // 模板文件不存在
            info.error = 'Project template is not exists.';
            return info;
        }

        // 从 zip 包中复制
        if (ps.extname(template).endsWith('zip')) {
            // 解压 zip 包
            fs.createReadStream(template).pipe(unzip.Extract({ path }));
        } else {
            // 复制文件夹
            fse.copySync(templatepath, path);
        }
        return this.getInfo(path);
    };

    /**
     * 删除项目
     * @param path 
     */
    remove(path) {
        if (fse.existsSync(path) === false) { // 项目不存在
            return false;
        }

        fse.removeSync(path); // 删除文件夹
        return true;
    };

    /**
     * 获取项目信息
     * 根据路径，获取一个项目文件夹内的项目配置信息
     * @param path 
     */
    getInfo(path) {
        // 配置的文件
        let filepath = ps.join(path, 'package.json');

        let info = {
            path: path,
            name: ps.basename(path),
        }

        if (fse.existsSync(filepath) === false) { // 项目配置文件不存在
            info.error = 'The package.json is not exists.';
        } else {
            try {
                Object.assign(info, JSON.parse(fse.readFileSync(filepath)))
            }
            catch (err) { // 项目配置文件，内容格式不正确
                info.error = 'The package.json is broken: ' + err.message;
            }
        }

        return info;
    };

    /**
     * 增加：最新打开记录
     * @param path 
     */
    configAddOpened(path) {
        // 先删除可能存在的记录
        this.configDeleteOpened(path);

        const config = this.configOpen();
        config.opened.unshift(path);

        // 重新保存
        this.configSave(config);
    }

    /**
     * 删除：打开记录
     * @param path 
     */
    configDeleteOpened(path) {
        const config = this.configOpen();
        const index = config.opened.findIndex(one => one === path);
        if (index !== -1) {
            config.opened.splice(index, 1);

            // 重新保存
            this.configSave(config);
        }
    }

    /**
     * 返回：操作记录
     * @param path 
     */
    configOpen() {
        const config = fse.readJsonSync(configFile, { throws: false });
        if (config === false) { // 数据不存在或错误
            config = { // 数据重置
                opened: [] // 最近打开了哪些项目
            }
        }

        return config;
    }

    /**
     * 操作记录，保存到文件
     * @param json 
     */
    configSave(json, path = configFile) {
        fse.outputJSONSync(path, json);
    }

}

module.exports = new ProjectManager();


