'use strict';

const i18n = require('@base/electron-i18n');
const { EventEmitter } = require('events');
const { join, basename } = require('path');
const { existsSync, statSync, readdirSync } = require('fs-extra');
const packageManager = require('../package');

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
}

module.exports = new I18n();

i18n.on('switch', (language) => {
    module.exports.emit('switch', language);
});

// 启动插件的时候，主动去查询内部的 i18n 文件夹，并注册到自己内部
packageManager.on('enable', (path, info) => {
    const dir = join(path, 'i18n');

    // i18n 文件夹不存在，说明插件没有本地化配置
    if (!existsSync(dir)) {
        return;
    }

    // 如果 i18n 不是文件夹，说明插件没有本地化配置
    const stat = statSync(dir);
    if (!stat.isDirectory()) {
        return;
    }

    const languages = readdirSync(dir);
    languages.forEach((language) => {
        let languageFile = join(dir, language);
        let data = require(languageFile);
        let json = {};
        json[info.pkg.name] = data;
        i18n.register(json, basename(language, '.js'));
    });
});
