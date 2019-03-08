'use strict';

const ps = require('path');
const fse = require('fs-extra');
const profile = require('@base/electron-profile');
const setting = require('@editor/setting');

class ProfileManager {

    /**
     * 读取指定的 profile 文件
     * @param {string} file
     */
    load(file) {
        return profile.load(file);
    }
}

module.exports = new ProfileManager();

// 注册 global profiles 协议
if (ps.isAbsolute(setting.PATH.HOME)) {
    // 注册一个默认协议， default 没有 path，不需要储存到硬盘上
    let path = ps.join(setting.PATH.HOME, './default-profiles');
    fse.mkdirsSync(path);
    profile.register('default', path);

    path = ps.join(setting.PATH.HOME, './profiles');
    fse.mkdirsSync(path);
    profile.register('global', path);
}

// 注册 local profiles 协议
if (ps.isAbsolute(setting.PATH.PROJECT)) {
    let path = ps.join(setting.PATH.PROJECT, './profiles');
    fse.mkdirsSync(path);
    profile.register('local', path);
}

// global 继承自 default
profile.inherit('global', 'default');

// local 继承自 global
profile.inherit('local', 'global');
