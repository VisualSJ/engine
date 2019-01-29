'use strict';

const i18n = require('./../../../lib/i18n');
const {File} = require('./../../../lib/utils');

/**
 * 翻译
 * @param {*} key
 */
function t(key) {
    return i18n.t(key);
}
exports.getName = File.getName;
exports.t = t;
