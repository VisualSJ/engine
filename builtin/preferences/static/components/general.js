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
        this.general[key] = event.target.value;

        switch (key) {
            case 'language':
                Editor.I18n.switch(event.target.value);
                break;
            case 'step':
                Editor.UI.NumInput.updateStep(event.target.value);
                break;
        }
    },
};

exports.mounted = function() {};
