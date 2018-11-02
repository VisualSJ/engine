'use stirct';

const fs = require('fs');
const ps = require('path');

exports.template = fs.readFileSync(ps.join(__dirname, '../template/preview.html'), 'utf8');

exports.props = ['preview'];
exports.data = function() {
    return {};
};

exports.methods = {
    /**
     * 翻译
     * @param key
     */
    t(key) {
        const name = `preferences.preview.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 常规设置的修改
     * @param {*} event
     * @param {*} key
     */
    _onpreviewChanged(event, key) {
        this.preview[key] = event.target.value;

        switch (key) {
            case 'autoRefresh':
                break;
            case 'previewBrowser':
                break;
            case 'simulatorPath':
                break;
        }
    },
};

exports.mounted = function() {
};
