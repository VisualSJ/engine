'use strict';

const profile = require('@base/electron-profile');

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
