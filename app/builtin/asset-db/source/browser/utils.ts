'use strict';

import { copy, existsSync, move, readdirSync, remove, statSync } from 'fs-extra';
import { basename, dirname, extname, join } from 'path';
import { forwarding } from './worker/index';

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

    do {
        if ((/\-\d{3}/.test(name))) {
            name = name.replace(/(\-(\d{3})$)/, (strA, strB, strC) => {
                let num = parseInt(strC, 10);
                num += 1;
                // @ts-ignore
                num = num.toString().padStart(3, '0');
                return `-${num}`;
            });
        } else {
            name += '-001';
        }

        file = join(dir, name);
    } while (!!existsSync(file + ext));

    return file + ext;
}

/**
 * 删除文件
 * @param file
 */
export async function removeFile(file: string) {
    if (!existsSync(file)) {
        return;
    }

    const stat = statSync(file);
    if (stat.isDirectory()) {
        const list = readdirSync(file);

        for (const name of list) {
            await removeFile(join(file, name));
        }
        await remove(file);
    } else {
        await remove(file);
    }
}

/**
 * 移动文件
 * @param file
 */
export async function moveFile(source: string, target: string) {
    if (
        !existsSync(source) ||
        !existsSync(source + '.meta') ||
        existsSync(target) ||
        existsSync(target + '.meta')
    ) {
        return;
    }

    const tmp = join(Editor.Project.tmpDir, 'move-tmp', basename(source));

    await copy(source, tmp);
    await copy(source + '.meta', tmp + '.meta');
    await removeFile(source);
    await removeFile(source + '.meta');
    await move(tmp, target);
    await move(tmp + '.meta', target + '.meta');
}

/**
 * 检查资源是否只读
 */
export async function isReadonly(uuid_or_url: string) {
    let uuid = uuid_or_url;

    if (uuid_or_url.startsWith('db://')) {
        uuid = await forwarding('asset-worker:query-uuid-from-url', uuid_or_url);
    }

    const info = await forwarding('asset-worker:query-asset-info', uuid);
    return info && info.readonly || false;
}
