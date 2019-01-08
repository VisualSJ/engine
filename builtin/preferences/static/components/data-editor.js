'use stirct';

const {readFileSync, existsSync} = require('fs');
const {join, extname, basename, relative} = require('path');

exports.template = readFileSync(join(__dirname, '../template/data-editor.html'), 'utf8');

exports.props = ['data_editor'];
exports.data = function() {
    return {};
};
exports.computed = {
    script_editor_name() {
        let path = this.data_editor.external_script_editor;
        if (!path || !existsSync(path)) {
            return '';
        }
        return basename(path, extname(path));
    },
    external_picture_editor() {
        let path = this.data_editor.external_picture_editor;
        if (!path || !existsSync(path)) {
            return '';
        }
        return relative(__dirname, path);
    },
};
exports.methods = {
    /**
     * 翻译
     * @param key
     */
    t(key) {
        const name = `preferences.data_editor.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 设置的修改
     * @param {*} event
     */
    _onConfirm(event) {
        const key = event.target.path;
        if (!key) {
            return;
        }
        const value =  event.target.value;
        this.data_editor[key] = value;
    },

    /**
     * 打开指定类型的窗口
     * @param {*} type
     */
    openWin(type) {
        let path = this.data_editor[type];
        if (!existsSync(path)) {
            // 打开默认窗口
            path = Editor.App.path;
        }
        const ext = Editor.isWin32 ? 'Exe' : 'App';
        // 打开指定路径
        Editor.Dialog.openFile({
            title: '选择编辑器',
            defaultPath: path,
            extensions: {name: ext, extensions: [ext.toLowerCase()]},
          }).then((filePaths) => {
            if (!filePaths[0]) {
                return;
            }
            this.data_editor[type] = filePaths[0];
          });
    },
};
