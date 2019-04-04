const {join} = require('path');
const {readFileSync} = require('fs-extra');
const {DEFAULT_CONFIG} = require('./../../static/utils/config.js');
const configProfile: any = {
    global: Editor.Profile.load('profile://global/packages/preview.json'),
    project: Editor.Profile.load('profile://local/packages/preview.json'),
};

/**
 * 查询配置信息
 * @param key
 * @param type
 */
function getConfig(key: string, type: string = 'previewConfig') {
    if (Object.keys(DEFAULT_CONFIG).indexOf(type) === -1) {
        console.warn(`查询类型无效(type=${type})`);
        return;
    }
    // 判断项目里是否选择了采用全局配置
    const sync_global = configProfile.project.get(`${type}.sync_global`);
    // 查询整项配置
    if (!key) {
        if (sync_global) {
            return configProfile.global.get(`${type}`) || DEFAULT_CONFIG[type];
        } else {
            return configProfile.project.get(`${type}`) || DEFAULT_CONFIG[type];
        }
    }

    const param = key.split('.');
    let defaultValue = null;
    // get default
    param.forEach((name: string) => {
        DEFAULT_CONFIG[type][name] && (defaultValue = DEFAULT_CONFIG[type][name]);
    });
    if (sync_global) {
        // 查询全局与默认配置
        return configProfile.global.get(`${type}.${key}`) || defaultValue;
    } else {
        return configProfile.project.get(`${type}.${key}`) || defaultValue;
    }
}

/**
 * 给预览脚本文件加上头尾
 * @param url
 * @param path
 */
async function getModules(url: string, path: string) {
    const HEADER = `(function() {
    "use strict";
    var __module = CC_EDITOR ? module : {exports:{}};
    var __filename = 'preview-scripts/${url}';
    var __require = CC_EDITOR ? function (request) {return cc.require(request, require);} :
    function (request) {return cc.require(request, __filename);};
    function __define (exports, require, module) {
    "use strict";`;
    const FOOTER = `    }if (CC_EDITOR) {
        __define(__module.exports, __require, __module);
}else {
    cc.registerModuleFunc(__filename, function () {
        __define(__module.exports, __require, __module);
    });
}})();`;
    const content = readFileSync(path, 'utf-8');
    return content;
    const reg = /cc._RF.push\s*\(\s*module,\s*([\'\"][^\'\"]+\s*[\'\"])\s*,\s*([\'\"][^\'\"]*[\'\"])\s*\)/;
    const rightContent = content.replace(reg, 'cc._RF.push(module, $1, $2, __filename)');
    return HEADER + rightContent + '\n' + FOOTER;
}

module.exports = {
    getConfig,
    configProfile,
    getModules,
};
