'use strict';

const { join } = require('path');
const { readTemplate, getFitSize } = require('../../../../utils');

const textureType = ['texture', 'texture-cube'];

exports.template = readTemplate('3d', './asset-section/public/image-preview.html');

exports.props = ['meta'];

exports.data = function() {
    return {
        info: '0 x 0',
    };
};

exports.methods = {
    async getImagePath() {
        const {
            meta: { userData = {}, uuid },
        } = this;

        if (userData && userData.imageSource) {
            return userData.imageSource;
        }
        const path = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', uuid);
        return path;
    },

    /**
     * 加载图片
     */
    async loadImage() {
        const src = await this.getImagePath();
        this._image = new Image();
        this._image.onload = () => {
            this._destroyed || this.updateImage();
        };
        this._image.src = src;
    },

    /**
     * 根据加载的图片资源进行更新
     */
    updateImage() {
        const { width, height } = this.getSize();
        this.info = `${width} x ${height}`;
        this.resize();
    },

    /**
     * 根据 asset 类型返回对应的图片宽高
     * @returns [{width: number, height: number}]
     */
    getSize() {
        let width = 0;
        let height = 0;
        if (textureType.includes(this.meta.__assetType__)) {
            width = this._image.width;
            height = this._image.height;
        } else if (this.meta.__assetType__ === 'sprite-frame') {
            width = this.meta.userData.width;
            height = this.meta.userData.height;
        }
        return {
            width,
            height,
        };
    },

    /**
     * 根据容器缩放
     */
    resize() {
        const { height: boxHeight, width: boxWidth } = this.$refs.content.getBoundingClientRect();
        const { width: imgWidth, height: imgHeight } = this.getSize();
        const [width, height] = getFitSize(imgWidth, imgHeight, boxWidth, boxHeight);
        if (this.meta.userData.rotated) {
            this._scalingSize = {
                width: Math.ceil(height),
                height: Math.ceil(width),
            };
        }
        this.$refs.canvas.width = Math.ceil(width);
        this.$refs.canvas.height = Math.ceil(height);
        this.repaint();
    },

    /**
     * 根据最新的数据进行重绘
     */
    repaint() {
        const canvas = this.$refs.canvas.getContext('2d');
        canvas.imageSmoothingEnabled = false;
        const canvasWidth = this.$refs.canvas.width;
        const canvasHeight = this.$refs.canvas.height;
        const { subMetas } = this.meta;

        if (textureType.includes(this.meta.__assetType__)) {
            canvas.drawImage(this._image, 0, 0, canvasWidth, canvasHeight);
            if (subMetas && subMetas['sprite-frame']) {
                [this.meta.subMetas['sprite-frame']].forEach((item) => {
                    if (!item || !item.userData) {
                        return;
                    }
                    const { userData } = item;
                    const ratioX = canvasWidth / this._image.width;
                    const ratioY = canvasHeight / this._image.height;
                    canvas.beginPath();
                    canvas.rect(
                        userData.trimX * ratioX,
                        userData.trimY * ratioY,
                        userData.width * ratioX,
                        userData.height * ratioY
                    );
                    canvas.lineWidth = 1;
                    canvas.strokeStyle = '#ff00ff';
                    canvas.stroke();
                });
            }
        } else if (this.meta.__assetType__ === 'sprite-frame') {
            let sWidth;
            let sHeight;
            let dx;
            let dy;
            let dWidth;
            let dHeight;

            if (this.meta.userData.rotated) {
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2;

                canvas.translate(centerX, centerY);
                canvas.rotate((-90 * Math.PI) / 180);
                canvas.translate(-centerX, -centerY);

                dx = centerX - this._scalingSize.width / 2;
                dy = centerY - this._scalingSize.height / 2;
                sWidth = this.meta.userData.height;
                sHeight = this.meta.userData.width;
                dWidth = canvasHeight;
                dHeight = canvasWidth;
            } else {
                dx = 0;
                dy = 0;
                sWidth = this.meta.userData.width;
                sHeight = this.meta.userData.height;
                dWidth = canvasWidth;
                dHeight = canvasHeight;
            }
            canvas.drawImage(
                this._image,
                this.meta.userData.trimX,
                this.meta.userData.trimY,
                sWidth,
                sHeight,
                dx,
                dy,
                dWidth,
                dHeight
            );
        }
    },
};

exports.mounted = async function() {
    this.loadImage();
    // todo
    // eventBus.on('panel:resize', this.updateImage);
};

exports.watch = {
    meta: {
        deep: true,
        handler() {
            this.updateImage();
        },
    },
    'meta.uuid': 'loadImage',
};

exports.destroyed = function() {
    this._destroyed = true;
};
