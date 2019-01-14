'use strict';

const path = require('path');
const fse = require('fs-extra');
const electron = require('electron');

const profile = {
    global: Editor.Profile.load('profile://global/packages/engine.json'),
    local: Editor.Profile.load('profile://local/packages/engine.json'),
};

exports.template = fse.readFileSync(path.join(__dirname, '../template/engine.html'), 'utf8');

exports.props = [
    'type',
    'language',
];

exports.data = function() {

    const position = 'local';

    // 兼容旧版本数据
    (() => {
        const local2D = profile.local.get('current.2d');
        const local3D = profile.local.get('current.3d');
        if (local2D) {
            profile.local.remove('current.2d');
            local2D !== 'builtin' && profile.local.set('2d.javascript.builtin', true);
            local2D !== 'builtin' && profile.local.set('2d.javascript.custom', local2D);
        }
        if (local3D) {
            profile.local.remove('current.3d');
            local2D !== 'builtin' && profile.local.set('3d.javascript.builtin', true);
            local3D !== 'builtin' && profile.local.set('3d.javascript.custom', local3D);
        }
    })();

    const javascript = profile[position].get(`${this.type}.javascript`) || { builtin: true, custom: '' };
    const native = profile[position].get(`${this.type}.native`) || { builtin: true, custom: '' };

    const json = {
        position: position, // 存储位置，默认打开存储到 local

        javascript: {
            builtin: javascript.builtin !== undefined ? javascript.builtin : true,
            custom: javascript.custom || '',
        },

        native: {
            builtin: native.builtin !== undefined ? native.builtin : true,
            custom: native.custom || '',
        },
    };

    return json;
};

exports.methods = {

    t(key, language) {
        return Editor.I18n.t(`engine.${key}`);
    },

    /**
     * 切换数据位置
     * @param {*} event
     * @param {*} position
     */
    _onSwitchPositionClick(event, position) {
        this.position = position;

        const javascript = profile[position].get(`${this.type}.javascript`) || { builtin: true, custom: '' };
        const native = profile[position].get(`${this.type}.native`) || { builtin: true, custom: '' };

        this.javascript.builtin = javascript.builtin !== undefined ? javascript.builtin : true;
        this.javascript.custom = javascript.custom || '';
        this.native.builtin = native.builtin !== undefined ? native.builtin : true;
        this.native.custom = native.custom || '';
    },

    /**
     * 切换内置、外部引擎
     * @param {*} event
     * @param {*} type
     */
    _onUseBuiltinEngineConfirm(event, type) {
        this[type].builtin = !this[type].builtin;

        profile[this.position].set(`${this.type}.${type}.builtin`, this[type].builtin);
        profile[this.position].save();
    },

    /**
     * 点击浏览按钮
     * @param {*} event
     * @param {*} type
     */
    async _onBrowserButtonClick(event, type) {
        let dir = path.dirname(this[type].custom);
        if (!fse.existsSync(dir) || dir === '.') {
            dir = Editor.Project.path;
        }
        const results = await Editor.Dialog.openDirectory({
            defaultPath: dir,
        });

        if (results && results[0] && fse.existsSync(results[0])) {
            this[type].custom = results[0];

            profile[this.position].set(`${this.type}.${type}.custom`, results[0]);
            profile[this.position].save();
        }
    },

    /**
     * 打开自定义引擎目录
     * @param {*} event
     * @param {*} type
     */
    _onOpenEngineDirectory(event, type) {
        if (fse.existsSync(this[type].custom)) {
            electron.shell.openItem(this[type].custom);
        }
    },
};
