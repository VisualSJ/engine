'use stirct';

const {readFileSync} = require('fs');
const {join, basename} = require('path');
exports.template = readFileSync(join(__dirname, '../template/modules.html'), 'utf8');
const {readJSONSync} = require('fs-extra');
exports.props = ['data'];
exports.data = function() {
    return {
        modules: {},
        excluded: [], // 排除的模块列表
    };
};

exports.computed = {
    selectAll: {
        get() {
            for (let name of Object.keys(this.modules)) {
                let item = this.modules[name];
                if (!item.checked) {
                    return false;
                }
            }
            return true;
        },
        set(bool) {
            this.excluded = [];
            Object.keys(this.modules).forEach((name) => {
                let item = this.modules[name];
                if (item.locked) {
                    return;
                }
                item.checked = bool;
            });
        },
    },
};
exports.methods = {
    /**
     * 翻译
     * @param key
     */
    t(key) {
        const name = `project-setting.module.${key}`;
        return Editor.I18n.t(name);
    },

    onSelectAll(event) {
        this.selectAll = event.target.value;
    },

    onSelectModule(event) {
        let name = event.target.path;
        let checked = event.target.value;
        if (checked) {
            // 选中模块，将当前模块从排除模块中去除
            let index = this.excluded.indexOf(name);
            this.excluded.splice(index, 1);
            this.modules[name].checked = checked;
            // 选中模块的情况下，依赖的模块也需要被选中
            this.modules[name].dependencies && this.modules[name].dependencies.forEach((name) => {
                this.modules[name].checked = checked;
                this.excluded.splice(this.excluded.indexOf(name), 1);
            });
        } else {
            // 添加进排除模块
            this.excluded.push(name);
            this.modules[name].checked = checked;
            // 未选中的情况，依赖于这个模块的模块也需要变成未选中状态
            Object.keys(this.modules).forEach((name) => {
                let item = this.modules[name];
                if (item.dependencies && item.dependencies.indexOf(name) !== -1) {
                    this.modules[name].checked = checked;
                    this.excluded.push(name);
                }
            });
        }
    },
};

exports.created = async function() {
    const info = await Editor.Ipc.requestToPackage('engine', 'query-info', Editor.Project.type);
    const modulesInfo = readJSONSync(join(info.path, 'modules.json'));
    this.excluded = this.data.excluded;
    let modules = Object.create(null);
    modulesInfo.forEach((item) => {
        if (this.excluded) {
            item.checked = this.excluded.indexOf(item.name) === -1;
        } else {
            item.checked = true;
        }
        modules[item.name] = item;
    });
    this.modules = modules;
};
