'use stirct';

const fs = require('fs');
const ps = require('path');

exports.template = fs.readFileSync(ps.join(__dirname, '../template/general.html'), 'utf8');

exports.props = ['general'];
exports.data = function() {
    return {};
};

exports.methods = {
    /**
     * 翻译
     * @param key
     */
    t(key, language) {
        const name = `preferences.general.${key}`;
        return Editor.I18n.t(name);
    },

    /**
     * 常规设置的修改
     * @param {*} event
     * @param {*} key
     */
    _onGeneralChanged(event, key) {
        const value =  event.target.value;
        this.general[key] = value;
        switch (key) {
            case 'language':
                Editor.I18n.switch(value);
                break;
            case 'node_tree':
                // TODO 设置层级管理器节点默认折叠状态
                break;
            case 'step':
                Editor.UI.NumInput.updateStep(value);
                break;
            case 'themeColor':
                Editor.Theme.useColor(value);
                break;
        }
    },
};

exports.mounted = function() {
};
