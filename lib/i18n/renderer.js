'use strict';

const i18n = require('@base/electron-i18n');

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