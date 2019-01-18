'use strict';

const uuidUtils = require('./source/uuid-utils');
const utils = require('./source/utils');
const mathUtils = require('./source/math-utils');

class Utils {

    get uuidUtils() {
        return uuidUtils;
    }

    get mathUtils() {
        return mathUtils;
    }

    /**
     * 初始化一个可用的文件名
     * @param file 初始文件路径
     * @returns {string} path 可用名称的文件路径
     */
    getName(file) {
        return utils.getName(file);
    }
}

module.exports = new Utils();
