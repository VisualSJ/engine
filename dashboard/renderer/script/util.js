'use strict';

const { existsSync } = require('fs');
const { basename, dirname, extname, join } = require('path');
const i18n = require('./../../../lib/i18n');
/**
 * 初始化一个可用的文件名
 * @param file 初始文件名
 */
function getName(file) {
    if (!existsSync(file)) {
        return file;
    }

    const dir = dirname(file);
    const ext = extname(file);
    let name = basename(file, ext);

    do {
        if ((/\_\d{3}/.test(name))) {
            name = name.replace(/(\_(\d{3})$)/, (strA, strB, strC) => {
                let num = parseInt(strC, 10);
                num += 1;
                // @ts-ignore
                num = num.toString().padStart(3, '0');
                return `_${num}`;
            });
        } else {
            name += '_001';
        }

        file = join(dir, name);
    } while (!!existsSync(file + ext));

    return file + ext;
}

/**
 * 翻译
 * @param {*} key
 */
function t(key) {
    return i18n.t(key);
}
exports.getName = getName;
exports.t = t;
