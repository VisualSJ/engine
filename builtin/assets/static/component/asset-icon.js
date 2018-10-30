'use strict';

const { readFileSync, existsSync, outputFileSync } = require('fs-extra');
const { join } = require('path');

const map = {
    database: { type: 'font', value: 'i-shujuku', },
    json: { type: 'font', value: 'i-json', },
    scene: { type: 'font', value: 'i-json', },
    directory: { type: 'font', value: 'i-folder', },
    javascript: { type: 'font', value: 'i-javascript', },
    typescript: { type: 'font', value: 'i-typescript', },
    'texture-packer': { type: 'font', value: 'i-zitigui-xianxing', },
    '*':       { type: 'font', value: 'i-file',        },

    // 需要生成预览图的类型
    texture:   {
        type: 'img',
        /**
         * 生成 texture 的缩略图
         * @param {*} uuid
         * @param {*} source
         */
        async generateImg(uuid, source) {
            const thumbnail = join(Editor.Project.path, 'temp', 'assets', uuid);
            if (existsSync(thumbnail)) {
                return readFileSync(thumbnail, 'utf8');
            }

            const $image = document.createElement('img');
            // todo 这里需要查询对应的数据
            $image.src = source.replace('db:/', Editor.Project.path);
            await new Promise((resolve, reject) => {
                $image.addEventListener('load', () => {
                    resolve();
                });
                $image.addEventListener('error', () => {
                    reject('thumbnail load fail');
                });
            });

            // 缩略图尺寸
            const size = 36;

            // 绘制的元素
            const $canvas = document.createElement('canvas');
            $canvas.width = size;
            $canvas.height = size;

            const coefficient = Math.max($image.width, $image.height) / size;
            const context = $canvas.getContext('2d');
            context.drawImage(
                $image, 0, 0, $image.width, $image.height,
                (size - $image.width / coefficient) / 2,
                (size - $image.height / coefficient) / 2,
                $image.width / coefficient,
                $image.height / coefficient
            );
            const value = $canvas.toDataURL('image/png');
            outputFileSync(thumbnail, value);
            return value;
        },
    },

    'sprite-frame': {
        type: 'img',
        /**
         * 生成 texture 的缩略图
         * @param {*} uuid
         * @param {*} source
         */
        async generateImg(uuid, source) {
            const thumbnail = join(Editor.Project.path, 'temp', 'assets', uuid);
            if (existsSync(thumbnail)) {
                return readFileSync(thumbnail, 'utf8');
            }

            const meta = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', uuid);
            if (!meta || (!meta.userData.textureUuid && !meta.userData.rawTextureUuid)) {
                return '';
            }

            const textureUuid = meta.userData.textureUuid || meta.userData.rawTextureUuid;
            const textureInfo = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', textureUuid);

            if (!textureInfo) {
                return '';
            }

            const $image = document.createElement('img');
            // todo 这里需要查询对应的数据
            $image.src = textureInfo.source.replace('db:/', Editor.Project.path);
            await new Promise((resolve, reject) => {
                $image.addEventListener('load', () => {
                    resolve();
                });
                $image.addEventListener('error', () => {
                    reject('thumbnail load fail');
                });
            });

            const rect = {
                x: meta.userData.offsetX || 0,
                y: meta.userData.offsetY || 0,
                w: meta.userData.width || $image.width,
                h: meta.userData.height || $image.height,
            };

            // 缩略图尺寸
            const size = 36;

            // 绘制的元素
            const $canvas = document.createElement('canvas');
            $canvas.width = size;
            $canvas.height = size;

            const coefficient = Math.max(rect.w, rect.h) / size;
            const context = $canvas.getContext('2d');
            context.drawImage(
                $image, 0, 0, rect.w, rect.h,
                (size - rect.w / coefficient) / 2,
                (size - rect.h / coefficient) / 2,
                rect.w / coefficient,
                rect.h / coefficient
            );
            const value = $canvas.toDataURL('image/png');
            outputFileSync(thumbnail, value);
            return value;
        },
    },
};

exports.template = readFileSync(join(__dirname, '../template/asset-icon.html'), 'utf8');

exports.props = [
    'uuid',
    'type',
    'source',
];

exports.data = function() {
    return {
        mode: 'font',
        value: 'i-file',
    };
};

exports.watch = {
    uuid() {
        this.init();
    },
};

exports.methods = {

    /**
     * 生成需要使用的数据
     */
    async init() {
        if (map[this.type]) {
            this.mode = map[this.type].type;
            this.value = map[this.type].value || '';
        } else {
            this.mode = map['*'].type;
            this.value = map['*'].value;
        }

        if (this.mode === 'img') {
            this.value = await map[this.type].generateImg(this.uuid, this.source);
        }
    },
};

exports.mounted = function() {
    this.init();
};
