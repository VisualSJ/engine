'use strict';

import { dirname, parse as pathParse } from 'path';
import { parse as urlParse } from 'url';
import { thumbnail } from './thumbnail';
const fileicon = require('./fileicon');

const protocol = 'db://';
const extToThumbnail = { // 需要生成缩略图的图片资源
    '2d': ['png', 'jpg', 'jpge', 'webp'],
    '3d': ['png', 'jpg', 'jpge', 'webp'],
};

/**
 * 输出是一个数组
 */
async function refresh() {
    const arr = await Editor.Ipc.requestToPackage('asset-db', 'query-assets');

    if (!arr) { // 数据可能为空
        return;
    }
    // arr.shift();
    // arr.shift();
    // arr.shift();
    // const rt = legalData(arr);
    // console.log(rt);
    // return;

    return legalData(arr);
}

async function ipcQuery(uuid: string) {
    const one = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
    const arr = legalData([one]);
    return arr;
}

/**
 * 处理原始数据
 * @param arr
 */
function legalData(arr: ItreeAsset[]) {
    const rt = arr.filter((a) => a.source !== '').map((a: ItreeAsset) => {
        const { protocol, hostname, pathname } = urlParse(a.source);
        const { base, dir, name, ext } = pathParse(a.source);

        a.protocol = unescape(protocol || '') + '//' || '';
        a.hostname = unescape(hostname || '') || '';
        a.host = a.protocol + a.hostname;
        a.pathname = unescape(pathname || '') || '';
        // @ts-ignore
        a.dirname = ['/', null].includes(pathname) ? '' : dirname(a.pathname);
        a.name = base;
        a.ext = ext.toLowerCase();
        a.filename = name;
        a.fileext = a.ext.split('.').pop() || '';
        a.parentSource = a.dirname === '' ? '' : a.host + (a.dirname === '' ? '/' : a.dirname);
        a.topSource = a.host + '/';
        a.isExpand = a.dirname === '' ? true : false;
        a.isParent = a.isDirectory ? true : false;
        a.thumbnail = '';
        a.icon = fileicon[a.fileext] || 'i-file';
        a.invalid = !a.uuid ? a.dirname === '' ? false : true : false; // 不可用是指不在db中，第一层节点除外，不可用节点在树形结构中它依然是一个正常的可折叠节点
        a.readonly = a.dirname === '' ? true : false;
        a.source = a.dirname === '' ? a.topSource : a.source; // 统一顶层节点出现的两种情况 db://assets/ 或 db://assets 为 db://assets/
        a.uuid = !a.uuid ? a.source : a.uuid; // 注意放在 a.invalid 和 a.source 赋值的下方；对于不可用的资源，指定一个模拟的 uuid
        a.state = '';

        // 生成缩略图
        // @ts-ignore
        if (extToThumbnail[Editor.Project.type].includes(a.fileext)) {
            (async (one: ItreeAsset) => {
                one.thumbnail = await thumbnail(one);
                // TODO 这个地方需要优化，减少触发频率
                // vm.changeData();
            })(a);
        }

        return a;
    });

    /**
     * 例如 db://a/b/c/d.js
     * 需要确保上层结构都存在
     * db://a
     * db://a/b
     * db://a/b/c
     */
    rt.slice().forEach((a: ItreeAsset) => {
        ensureDir(rt, a.parentSource);
    });

    return rt;
}

/**
 * 确保树形路径都存在
 */
function ensureDir(arr: ItreeAsset[], parentSource: string) {

    // @ts-ignore
    if (['', 'db:/'].includes(parentSource)) { // 数据开始错误
        return;
    }

    if (!arr.some((a: ItreeAsset) => a.source === parentSource)) {

        const newOne = {
            files: [],
            importer: 'unknown',
            isDirectory: true,
            source: parentSource,
            subAssets: {},
        };
        // @ts-ignore
        legalData([newOne]).forEach((a) => {
            if (!arr.some((b: ItreeAsset) => a.source === b.source)) {
                arr.push(a);
            }
        });

        // 继续迭代
        ensureDir(arr, dirname(parentSource));
    }
}

exports.protocol = protocol;
exports.refresh = refresh;
exports.ipcQuery = ipcQuery;
