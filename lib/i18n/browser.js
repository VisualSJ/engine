'use strict';

const i18n = require('@base/electron-i18n');

const languages = {
    zh: require('./languages/zh'),
    en: require('./languages/en'),
};

// 注册编辑器默认使用的本地化语言
i18n.register(languages.en, 'en');
i18n.register(languages.zh, 'zh');

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