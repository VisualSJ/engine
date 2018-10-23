'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

function generateTemplate(info, resolve) {
    let url = info.source || 'db://assets';
    if (url[url.length - 1] !== '/') {
        url += '/';
    }
    return [
        {
            label: 'Folder',
            enabled: info.isDirectory,
            async click() {
                url += 'New Folder';
                url = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, null);
                resolve(url);
            }
        },
        { type: 'separator', },
        {
            label: 'JavaScript',
            enabled: info.isDirectory,
            async click() {
                url += 'NewScript.js';
                const template = readFileSync(join(__dirname, './template/javascript'), 'utf8');
                url = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, template);
                resolve(url);
            }
        },
        {
            label: 'TypeScript',
            enabled: info.isDirectory,
            async click() {
                url += 'NewScript.ts';
                const template = readFileSync(join(__dirname, './template/typescript'), 'utf8');
                url = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, template);
                resolve(url);
            }
        },
        { type: 'separator', },
        {
            label: 'Scene',
            enabled: info.isDirectory,
            async click() {
                url += 'New Scene.fire';
                const template = readFileSync(join(__dirname, './template/scene'), 'utf8');
                url = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, template);
                resolve(url);
            }
        },
        { type: 'separator', },
        {
            label: 'AnimationClip',
            enabled: info.isDirectory,
            async click() {
                url += 'New Animation.anim';
                const template = readFileSync(join(__dirname, './template/animation'), 'utf8');
                url = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, template);
                resolve(url);
            }
        },
        { type: 'separator', },
        {
            label: 'AutoAtlas',
            enabled: info.isDirectory,
            async click() {
                url += 'AutoAtlas.pac';
                const template = readFileSync(join(__dirname, './template/auto-atlas'), 'utf8');
                url = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, template);
                resolve(url);
            }
        },
        { type: 'separator', },
        {
            label: 'LabelAtlas',
            enabled: info.isDirectory,
            async click() {
                url += 'LabelAtlas.labelatlas';
                const template = readFileSync(join(__dirname, './template/label-atlas'), 'utf8');
                url = await Editor.Ipc.requestToPackage('asset-db', 'create-asset', url, template);
                resolve(url);
            }
        },
    ];
}

exports.generateTemplate = generateTemplate;

/**
 * 创建文件的菜单
 */
exports.popup = async function(x, y, uuid) {
    const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', uuid);
    return new Promise((resolve) => {
        Editor.Menu.popup({
            x, y,
            menu: generateTemplate(info, resolve),
        });
    });
};
