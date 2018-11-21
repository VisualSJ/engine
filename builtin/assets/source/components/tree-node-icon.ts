'use strict';

import { existsSync, outputFileSync, readFileSync } from 'fs-extra';
import { join } from 'path';

let vm: any;
const map = {
    '*': { type: 'icon', value: 'i-file' },
    'texture-packer': { type: 'icon', value: 'i-packer' },
    database: { type: 'icon', value: 'i-database' },
    json: { type: 'icon', value: 'i-json' },
    scene: { type: 'icon', value: 'i-json' },
    javascript: { type: 'icon', value: 'i-javascript' },
    typescript: { type: 'icon', value: 'i-typescript' },
    video: { type: 'icon', value: 'i-video' },

    // 需要生成预览图的类型
    texture: {
        type: 'image',
        /**
         * 生成 texture 的缩略图
         * @param {*} uuid
         * @param {*} source
         */
        async generateImg(asset: ItreeAsset) {
            const thumbnail = await getDataURL(asset);
            if (thumbnail.startsWith('data:image')) {
                return thumbnail;
            }

            const dbInfo = dbInfos[asset.topSource];
            const src = join(dbInfo.target, asset.source.substr(dbInfo.protocol.length));
            return await setDataURL(src, thumbnail, { x: 0, y: 0 });
        },
    },
    image: {
        type: 'image',
        /**
         * 生成 image 的缩略图
         * @param {*} uuid
         * @param {*} source
         */
        async generateImg(asset: ItreeAsset) {
            const thumbnail = await getDataURL(asset);
            if (thumbnail.startsWith('data:image')) {
                return thumbnail;
            }

            const dbInfo = dbInfos[asset.topSource];
            const src = join(dbInfo.target, asset.source.substr(dbInfo.protocol.length));
            return await setDataURL(src, thumbnail, { x: 0, y: 0 });
        },
    },
    'sprite-frame': {
        type: 'image',
        /**
         * 生成 texture 的缩略图
         * @param {*} uuid
         * @param {*} source
         */
        async generateImg(asset: ItreeAsset) {
            const thumbnail = await getDataURL(asset);
            if (thumbnail.startsWith('data:image')) {
                return thumbnail;
            }

            const meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', asset.uuid);
            if (!meta || (!meta.userData.textureUuid && !meta.userData.rawTextureUuid)) {
                return '';
            }

            const textureUuid = meta.userData.textureUuid || meta.userData.rawTextureUuid;
            const textureInfo = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', textureUuid);
            if (!textureInfo) {
                return '';
            }

            const dbInfo = dbInfos[asset.topSource];
            const src = join(dbInfo.target, textureInfo.source.substr(dbInfo.protocol.length));
            const json = {
                x: meta.userData.offsetX || 0,
                y: meta.userData.offsetY || 0,
                width: meta.userData.width,
                height: meta.userData.height,
            };
            return await setDataURL(src, thumbnail, json);
        },
    },
};

// 数据 db 的信息
const dbInfos: any = {};

async function getDataURL(asset: ItreeAsset) {
    let dbInfo = dbInfos[asset.topSource];
    if (!dbInfo) {
        dbInfo = await Editor.Ipc.requestToPackage('asset-db', 'query-database-info', asset.topSource);
        dbInfos[asset.topSource] = dbInfo;
    }
    const cachePath = join(dbInfo.temp, asset.uuid);
    if (existsSync(cachePath)) {
        return readFileSync(cachePath, 'utf8');
    }
    return cachePath;
}

async function setDataURL(src: string, cachePath: string, json: any) {
    // console.log(src, cachePath);

    const img = document.createElement('img');
    img.src = src;
    await new Promise((resolve, reject) => {
        img.addEventListener('load', () => {
            resolve(img);
        });
        img.addEventListener('error', () => {
            reject('thumbnail load fail');
        });
    });

    const size = 28;
    const width = json.width || img.width;
    const height = json.height || img.height;
    const coefficient = Math.max(width, height) / size;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context: any = canvas.getContext('2d');

    context.drawImage(
        img, 0, 0, width, height,
        (size - width / coefficient) / 2,
        (size - height / coefficient) / 2,
        width / coefficient,
        height / coefficient
    );
    const value = canvas.toDataURL('image/png');
    outputFileSync(cachePath, value);
    return value;

}

export const template = readFileSync(
    join(__dirname, '../../static/template/tree-node-icon.html'),
    'utf8'
);

export const props = [
    'asset',
];

export function data() {
    return {
        type: 'icon',
        value: 'i-file',
    };
}

export const methods = {
    /**
     * 生成需要使用的数据
     */
    async init() {
        const importer = vm.asset.importer;
        // @ts-ignore
        const one = map[importer];
        if (one) {
            vm.type = one.type;
            vm.value = one.value || '';
            if (vm.type === 'image') {
                vm.value = await one.generateImg(vm.asset);
            }
        } else {
            vm.type = map['*'].type;
            vm.value = map['*'].value;
        }
    },
};

export function mounted() {
    // @ts-ignore
    vm = this;
    vm.init();
}
