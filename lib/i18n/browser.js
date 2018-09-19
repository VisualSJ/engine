'use strict';

const i18n = require('@base/electron-i18n');
const EventEmitter = require('events').EventEmitter;
const languages = {
    zh: require('./languages/zh'),
    en: require('./languages/en'),
};

// 注册编辑器默认使用的本地化语言
i18n.register(languages.en, 'en');
i18n.register(languages.zh, 'zh');

class I18n extends EventEmitter {

    /**
     * 翻译
     * @param {string} key
     */
    t(key) {
        return i18n.translation(key);
    }

    /**
     * 切换语言
     * @param {*} language
     */
    switch(language) {
        if (language !== 'zh' && language !== 'en') {
            return;
        }
        i18n.switch(language);
    }

    /**
     * 监听语言切换
     * @param {Function} func
    */
    // onSwitch(func) {
    //     if (typeof func !== 'function') {
    //         return;
    //     }
    //     i18n.on('switch', func);
    // }
}

module.exports = new I18n();
