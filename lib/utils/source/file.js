const { existsSync } = require('fs');
const { basename, dirname, extname, join } = require('path');
/**
 * 文件类工具方法
 */
const FileUtils = {
    /**
     * 初始化一个可用的文件名
     * @param file 初始文件路径
     * @returns {string} path 可用名称的文件路径
     */
    getName(file) {
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
    },
};

module.exports = FileUtils;
