'use strict';

const { dirname } = require('path');

/**
 * 删除一个文件以及其使用的所有模块缓存
 * @param {*} file
 * @param {*} scope
 */
function removeCache(file, scope) {
    scope = scope || dirname(file);
    const mod = require.cache[file];

    // 如果排除的文件已经超出了 scope 定义的文件夹
    // 则忽略这个文件，因为没有办法确定他需要删除
    if (file.indexOf(scope) !== -1) {
        return;
    }

    delete require.cache[file];
    mod.children && mod.children.forEach((child) => {
        removeCache(child, scope);
    });
}

exports.removeCache = removeCache;
