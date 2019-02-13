'use stirct';

/**
 * 脚本在引擎内使用的时候，需要注入到引擎提供的管理器内。
 * 所以需要在脚本头尾增加部分代码。
 *
 * 通过 project-scripts 协议获取的脚本资源，会自动增加这部分的代码。
 */

/**
 * 拼接实际的文本
 * @param text
 * @param source
 */
function disableCommonJS(text: string, source: string) {
    // (HEADER should not contain newline)
    const HEADER = `
(function () {
    "use strict";
    const path = require('path');

    const name = path.basename('${source}', '.js');
    const dir = path.dirname('${source}');

    var __module = { exports: {} };
    var __require = function (request) {
        if (window.__name2module[request]) {
            return window.__name2module[request];
        }
        request = path.join(dir, request);
        if (window.__source2module[request]) {
            return window.__source2module[request];
        }
        return null;
    };

    function define(exports, require, module) {
    `;
    const FOOTER = `
    }
    define(__module.exports, __require, __module);

    if (!window.__source2module) {
        window.__source2module = Object.create(null);
    }

    if (!window.__name2module) {
        window.__name2module = Object.create(null);
    }

    window.__source2module['${source}'] = __module;
    window.__name2module[name] = __module;
})();
    `;

    // keep sourcemap the last line
    let lastLineBegin = text.lastIndexOf('\n');
    if (lastLineBegin !== -1) {
        let lastLine = text.slice(lastLineBegin).trimLeft();
        if (!lastLine) {
            // skip last empty line
            lastLineBegin = text.lastIndexOf('\n', lastLineBegin - 1);
            lastLine = text.slice(lastLineBegin).trimLeft();
        }
        if (lastLine.startsWith('//')) {
            // found sourcemap
            return HEADER + text.slice(0, lastLineBegin) + FOOTER + lastLine;
        }
    }

    return HEADER + text + FOOTER;
}

export const type = 'registerStringProtocol';

export async function handler(request: any, callback: any) {
    const fs = require('fs');
    const url = require('url');
    const urlObj = url.parse(request.url);
    if (!urlObj.slashes) {
        console.error('Please use "project-scripts://" + uuid.');
        return callback(-6); // net::ERR_FILE_NOT_FOUND
    }

    let file: any;
    let source: any;
    try {
        // convert url to path
        const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', urlObj.hostname);
        source = info.source.substr(5);
        file = info.library['.js'];
    } catch (error) { }

    if (!file) {
        callback(-6); // net::ERR_FILE_NOT_FOUND
        return;
    }

    fs.readFile(file, 'utf8', (err: any, data: any) => {
        if (err) {
            console.error(`Failed to read ${file}, ${err}`);
            return callback(-6); // net::ERR_FILE_NOT_FOUND
        }
        callback({ data: disableCommonJS(data, source), charset: 'utf-8' });
    });
}

export function error(error: any) {
    if (error) {
        console.error('Failed to register protocol project-scripts, %s', error.message);
        return;
    }
    // console.info('protocol project-scripts registerred');
}
