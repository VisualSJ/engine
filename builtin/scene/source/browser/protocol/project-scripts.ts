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
    var __module = CC_EDITOR ? module : { exports: {} };
    var __filename = '${source}';
    var __require = CC_EDITOR ?
        function (request) { return cc.require(request, require); } :
        function (request) { return cc.require(request, __filename); };

    function __define(exports, require, module) {
    `;
    const FOOTER = `
    }
    if (CC_EDITOR) {
        __define(__module.exports, __require, __module);
    } else {
        cc.registerModuleFunc(__filename, function () {
            __define(__module.exports, __require, __module);
        });
    }
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
        file = info.files[0];
        if (/\.map/.test(file)) {
            file = info.files[1];
        }
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
