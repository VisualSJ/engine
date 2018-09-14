'use strict';

import { existsSync } from 'fs';
import { basename, dirname, extname, join } from 'path';

/**
 * 初始化一个可用的文件名
 * @param file 初始文件名
 */
export function getName(file: string) {
    if (!existsSync(file)) {
        return file;
    }

    const dir = dirname(file);
    const ext = extname(file);
    let name = basename(file, ext);

    if (!(/\-\d{3}&/.test(name))) {
        name += '-000';
    }

    do {
        name = name.replace(/(\-(\d{3})?)/, (strA, strB, strC) => {
            let num = strC ? parseInt(strC, 10) : 0;
            num += 1;
            if (num < 10) {
                strC = '00' + num;
            } else if (num < 100) {
                strC = '0' + num;
            }
            return `-${strC}`;
        });

        file = join(dir, name);
    } while (!!existsSync(file));

    return file + ext;
}
