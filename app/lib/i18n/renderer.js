'use strict';

const i18n = require('@base/electron-i18n');
const ipc = require('@base/electron-base-ipc');
const EventEmitter = require('events').EventEmitter;

class I18n extends EventEmitter {

    /**
     * 当前的语言种类
     */
    get language() {
        return ipc.sendSync('editor3d-lib-i18n:language');
    }

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
}

module.exports = new I18n();

i18n.on('switch', (language) => {
    module.exports.emit('switch', language);
});
