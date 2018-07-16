'use strict';

const i18n = require('@base/electron-i18n');

i18n.register({
    menu: {
        edit: 'edit',
        panel: 'panel',
        develop: 'developer',

        about_cocos: 'About Cocos3d',
        hide: 'Hide',
        hide_other: 'Hide other',
        show_all: 'Show all',
        quit: 'quit',

        undo: 'Undo',
        redo: 'Redo',
        cut: 'Cut',
        copy: 'Copy',
        paste: 'Paste',

        reload: 'Reload',
        toggle_devtools: 'Toggle Devtools',
    },
}, 'en');

i18n.register({
    menu: {
        edit: '编辑',
        panel: '面板',
        develop: '开发者',

        about_cocos: '关于 Cocos3d',
        hide: '隐藏',
        hide_other: '隐藏其他',
        show_all: '显示全部',
        quit: '退出',

        undo: '撤销',
        redo: '重做',
        cut: '剪切',
        copy: '复制',
        paste: '粘贴',

        reload: '重新加载',
        toggle_devtools: '切换开发人员工具',
    },
}, 'zh');

class I18n {

    /**
     * 翻译
     * @param {string} key
     */
    t (key) {
        return i18n.translation(key);
    }

    /**
     * 切换语言
     * @param {*} language 
     */
    switch (language) {
        if (language !== 'zh' && language !== 'en') {
            return;
        }
        i18n.switch(language);
    }
}

module.exports = new I18n();