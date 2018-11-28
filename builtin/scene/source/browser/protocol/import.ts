'use stirct';

/**
 * 引擎在加载文件的时候使用的是 uuid
 * 这里注册一个 import 协议，将 uuid 对应指向到实际的 library 地址
 */

export const type = 'registerFileProtocol';

export async function handler(request: any, callback: any) {
    const url = decodeURIComponent(request.url);
    const uri = require('url').parse(url);
    const path = require('path');
    const fs = require('fs');
    let result = path.join(Editor.Project.path, 'library', uri.host, uri.path);
    if (!fs.existsSync(result)) {
        result = path.join(Editor.App.path, 'builtin/asset-db/static/internal/library', uri.host, uri.path);
    }
    callback({ path: result });
}

export function error(error: any) {
    if (error) {
        console.error('Failed to register protocol import, %s', error.message);
        return;
    }
}
