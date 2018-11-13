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
    let firstLoop = true;

    do {
        if (firstLoop) { // 使得 a.js -> a-001.js; a-001.js -> a-001-001.js
            name += '-001';
            firstLoop = false;
        } else if ((/\-\d{3}/.test(name))) {
            name = name.replace(/(\-(\d{3})$)/, (strA, strB, strC) => {
                let num = parseInt(strC, 10);
                num += 1;
                // @ts-ignore
                num = num.toString().padStart(3, '0');
                return `-${num}`;
            });
        }

        file = join(dir, name);
    } while (!!existsSync(file + ext));

    return file + ext;
}
