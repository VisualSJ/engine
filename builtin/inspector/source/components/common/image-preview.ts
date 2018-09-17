'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

import { eventBus } from './event-bus';

export const template = readFileSync(join(__dirname, '../../../static/template/image-preview.html'), 'utf8');

export const props: string[] = ['meta'];

export const components = {
    'my-prop': require('../prop')
};

export function data() {
    return {
        cssHost: {
            position: 'relative',
            height: '300px',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 15px 5px rgba(0,0,0,0.5)',
            background: '#292929'
        },
        cssContent: {
            position: 'absolute',
            top: '15px',
            right: '15px',
            bottom: '15px',
            left: '15px'
        },
        cssCanvas: {
            margin: 'auto',
            display: 'block',
            backgroundImage: "url('packages://inspector/static/checkerboard-32x32.png')",
            backgroundSize: '32px 32px',
            backgroundPosition: 'center center'
        },
        cssLabels: {
            position: 'absolute',
            bottom: '10px',
            width: '100%'
        },
        cssLabel: {
            textAlign: 'center',
            padding: '2px 10px',
            fontSize: '10px',
            fontWeight: 'bold',
            borderRadius: '3px',
            color: '#fff',
            background: '#4281b6'
        },
        info: '0 x 0'
    };
}

export const methods = <any>{
    /**
     * 加载指定 src 的图片
     * @param {string} src
     */
    loadImage(src: string) {
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
        let width: number = 0;
        let height: number = 0;
        if (this.meta.__assetType__ === 'texture') {
            width = this._image.width;
            height = this._image.height;
        } else if (this.meta.__assetType__ === 'sprite-frame') {
            width = this.meta.width;
            height = this.meta.height;
        }
        return {
            width,
            height
        };
    },
    /**
     * 根据容器缩放
     */
    resize() {
        const { height: boxHeight, width: boxWidth } = this.$refs.content.getBoundingClientRect();
        const { width: imgWidth, height: imgHeight } = this.getSize();
        const [width, height] = this.getFitSize(imgWidth, imgHeight, boxWidth, boxHeight);
        if (this.meta.rotated) {
            this._scalingSize = { width: Math.ceil(height), height: Math.ceil(width) };
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

        if (this.meta.__assetType__ === 'texture') {
            canvas.drawImage(this._image, 0, 0, canvasWidth, canvasHeight);
            this.meta.subMetas &&
                this.meta.subMetas.forEach((item: any) => {
                    const ratioX = canvasWidth / this._image.width;
                    const ratioY = canvasHeight / this._image.height;
                    canvas.beginPath();
                    canvas.rect(item.trimX * ratioX, item.trimY * ratioY, item.width * ratioX, item.height * ratioY);
                    canvas.lineWidth = 1;
                    canvas.strokeStyle = '#ff00ff';
                    canvas.stroke();
                });
        } else if (this.meta.__assetType__ === 'sprite-frame') {
            let sWidth;
            let sHeight;
            let dx;
            let dy;
            let dWidth;
            let dHeight;

            if (this.meta.rotated) {
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2;

                canvas.translate(centerX, centerY);
                canvas.rotate((-90 * Math.PI) / 180);
                canvas.translate(-centerX, -centerY);

                dx = centerX - this._scalingSize.width / 2;
                dy = centerY - this._scalingSize.height / 2;
                sWidth = this.meta.height;
                sHeight = this.meta.width;
                dWidth = canvasHeight;
                dHeight = canvasWidth;
            } else {
                dx = 0;
                dy = 0;
                sWidth = this.meta.width;
                sHeight = this.meta.height;
                dWidth = canvasWidth;
                dHeight = canvasHeight;
            }
            canvas.drawImage(this._image, this.meta.trimX, this.meta.trimY, sWidth, sHeight, dx, dy, dWidth, dHeight);
        }
    },
    /**
     * 比对图片和容器的宽高返回合适的尺寸
     * @param {number} imgWidth
     * @param {number} imgHeight
     * @param {number} boxWidth
     * @param {number} boxHeight
     * @returns {number[]}
     */
    getFitSize(imgWidth: number, imgHeight: number, boxWidth: number, boxHeight: number): number[] {
        let width = imgWidth;
        let height = imgHeight;
        if (imgWidth > boxWidth && imgHeight > boxHeight) {
            // 图片宽高均大于容器
            width = boxWidth;
            height = (imgHeight * boxWidth) / imgWidth;
            if (height > boxHeight) {
                // 高度比例大于宽度比例
                height = boxHeight;
                width = (imgWidth * boxHeight) / imgHeight;
            }
        } else {
            if (imgWidth > boxWidth) {
                // 图片宽度大于容器宽度
                width = boxWidth;
                height = (imgHeight * boxWidth) / imgWidth;
            } else if (imgHeight > boxHeight) {
                // 图片高度大于容器高度
                height = boxHeight;
                width = (imgWidth * boxHeight) / imgHeight;
            }
        }
        return [width, height];
    }
};

export function mounted(this: any) {
    const { __src__ } = this.meta;

    this.loadImage(__src__);
    eventBus.on('panel:resize', this.updateImage);
}

export const watch = {
    meta: {
        deep: true,
        handler(this: any) {
            this.updateImage();
        }
    }
};

export function destroyed(this: any) {
    eventBus.off('panel:resize', this.updateImage);
    this._destroyed = true;
}
