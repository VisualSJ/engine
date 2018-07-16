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
    load (file) {
        return profile.load(file);
    }
}

module.exports = new ProfileManager();

if (ps.isAbsolute(setting.PATH.HOME)) {
    let path = ps.join(setting.PATH.HOME, './profiles');
    fse.mkdirsSync(path);
    profile.register('global', path);
}

if (ps.isAbsolute(setting.PATH.PROJECT)) {
    let path = ps.join(setting.PATH.PROJECT, './local/profiles');
    fse.mkdirsSync(path);
    profile.register('local', path);
}
