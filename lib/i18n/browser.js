'use strict';

const util = require('util');
const i18n = require('@base/electron-i18n');
const setting = require('@editor/setting');
const { EventEmitter } = require('events');
const { join, basename } = require('path');
const { existsSync, statSync, readdirSync, readJSONSync, outputJSONSync } = require('fs-extra');
const packageManager = require('../package');

const languages = {
    zh: require('./languages/zh'),
    en: require('./languages/en'),
};

// 存放本地化信息的文件
const file = join(setting.PATH.HOME, 'editor/i18n.json');
let json;
try {
    json = readJSONSync(file);
} catch (error) {
    json = {
        language: 'en',
    };
}

if (json.language === 'zh' || json.language === 'en') {
    i18n.switch(json.language);
}

/**
 * 保存 windows 的 dump 数据
 */
let save = function() {
    try {
        outputJSONSync(file, json);
    } catch (error) {
        console.error(error);
    }
};

// 注册编辑器默认使用的本地化语言
i18n.register(languages.en, 'en');
i18n.register(languages.zh, 'zh');

class I18n extends EventEmitter {

    /**
     * 当前的语言种类
     */
    get language() {
        return json.language;
    }

    /**
     * 翻译
     * @param {string} key
     */
    t(key, ...args) {
        let text = i18n.translation(key);
        if (args && args.length) {
            return util.format(text, ...args);
        } else {
            return text;
        }
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
    json.language = language;
    save();
});

// 启动插件的时候，主动去查询内部的 i18n 文件夹，并注册到自己内部
packageManager.on('before-enable', (path, info) => {
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
        json[info.info.name] = data;
        i18n.register(json, basename(language, '.js'));
    });
});
