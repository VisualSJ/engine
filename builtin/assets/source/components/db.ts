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
    // expandSubAssets(arr);
    // console.log(arr);
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
    // 展平里面的 subAssets
    expandSubAssets(arr);
    //
    const rt = arr.filter((a) => !!a.source).map((a: ItreeAsset) => {
        if (a.isSubAsset) {
            return a;
        }

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
        a.isParent = a.isParent ? true : a.isDirectory ? true : false; // 树形的父级三角形依据此字段
        a.thumbnail = '';
        a.icon = fileicon[a.fileext] || 'i-file';
        // 不可用是指不在db中，第一层节点除外，不可用节点在树形结构中它依然是一个正常的可折叠节点
        a.invalid = a.invalid ? true : !a.uuid ? a.dirname === '' ? false : true : false;
        a.readonly = a.dirname === '' ? true : false; // 根节点和 subAssets 都只读
        a.source = a.dirname === '' ? a.topSource : a.source; // 统一顶层节点出现的两种情况 db://assets/ 或 db://assets 为 db://assets/
        a.uuid = !a.uuid ? a.source : a.uuid; // 注意放在 a.invalid 和 a.source 赋值的下方；对于不可用的资源，指定一个模拟的 uuid
        a.state = '';

        // 生成缩略图
        // @ts-ignore
        if (extToThumbnail[Editor.Project.type].includes(a.fileext)) {
            (async (one: ItreeAsset) => {
                one.thumbnail = await thumbnail(one);
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

/**
 * 展开末级 subAssets 资源，使之平级在数组中
 * @param arr
 */
function expandSubAssets(arr: ItreeAsset[]) {
    // 这里使用 for 有不断执行尾部新进元素的作用
    for (const asset of arr) {
        if (!asset.subAssets) {
            continue;
        }
        const keys = Object.keys(asset.subAssets);
        if (keys.length === 0) {
            continue;
        }

        keys.forEach((key) => {
            const subAsset = asset.subAssets[key];
            subAsset.parentSource = asset.source; // 重要
            subAsset.parentUuid = asset.uuid; // 重要
            subAsset.source = asset.source + '@' + key; // 这个数据只用于识别为树形节点
            subAsset.name = key; // 树形节点的名称
            subAsset.state = ''; // 激活可以被拖拽
            subAsset.icon = 'i-file'; // 默认图标
            subAsset.isSubAsset = true; // 重要

            asset.isParent = true; // 父级是父节点
            // 插入到队列
            arr.push(subAsset);
        });
    }
}

exports.protocol = protocol;
exports.refresh = refresh;
exports.ipcQuery = ipcQuery;
