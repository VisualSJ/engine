'use strict';

const textureType = ['texture', 'texture-cube'];

exports.template = `
<div class="image-preview">
    <div ref="content" class="content">
        <canvas ref="canvas" width=1 height=1></canvas>
    </div>
    <div class="label">
        <span>{{ info }}</span>
    </div>
</div>
`;

export const props = ['meta', 'imgSrc'];

export function data() {
    return {
        info: '0 x 0',
    };
}

export const methods = {
    // async getImagePath() {
    //     const {
    //         meta: { userData = {}, uuid },
    //     } = this;

    //     if (userData && userData.imageSource) {
    //         return userData.imageSource;
    //     }
    //     const path = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-path', uuid);
    //     return path;
    // },

    /**
     * 加载图片
     */
    async loadImage() {
        const vm: any = this;
        if (vm.imgSrc) {
            vm._image = new Image();
            vm._image.onload = () => {
                vm._destroyed || vm.updateImage();
            };
            vm._image.src = vm.imgSrc;
        }
    },

    /**
     * 根据加载的图片资源进行更新
     */
    updateImage() {
        const vm: any = this;
        if (vm._image) {
            const { width, height } = this.getSize();
            vm.info = `${width} x ${height}`;
            setTimeout(() => {
                this.resize();
            }, 100);
        }
    },

    /**
     * 根据 asset 类型返回对应的图片宽高
     * @returns [{width: number, height: number}]
     */
    getSize() {
        const vm: any = this;
        let width = 0;
        let height = 0;
        if (textureType.includes(vm.meta.importer)) {
            width = vm._image.width;
            height = vm._image.height;
        } else if (vm.meta.importer === 'sprite-frame') {
            width = vm.meta.userData.width;
            height = vm.meta.userData.height;
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
        const vm: any = this;
        if (vm._image) {
            const { height: boxHeight, width: boxWidth } = vm.$refs.content.getBoundingClientRect();
            const { width: imgWidth, height: imgHeight } = this.getSize();
            const [width, height] = getFitSize(imgWidth, imgHeight, boxWidth, boxHeight);
            if (vm.meta.userData.rotated) {
                vm._scalingSize = {
                    width: Math.ceil(height),
                    height: Math.ceil(width),
                };
            }
            vm.$refs.canvas.width = Math.ceil(width);
            vm.$refs.canvas.height = Math.ceil(height);
            vm.repaint();
        }
    },

    /**
     * 根据最新的数据进行重绘
     */
    repaint() {
        const vm: any = this;
        const canvas = vm.$refs.canvas.getContext('2d');
        canvas.imageSmoothingEnabled = false;
        const canvasWidth = vm.$refs.canvas.width;
        const canvasHeight = vm.$refs.canvas.height;
        const { subMetas } = vm.meta;

        if (textureType.includes(vm.meta.importer)) {
            canvas.drawImage(vm._image, 0, 0, canvasWidth, canvasHeight);
            if (subMetas && subMetas['sprite-frame']) {
                [vm.meta.subMetas['sprite-frame']].forEach((item) => {
                    if (!item || !item.userData) {
                        return;
                    }
                    const { userData } = item;
                    const ratioX = canvasWidth / vm._image.width;
                    const ratioY = canvasHeight / vm._image.height;
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
        } else if (vm.meta.importer === 'sprite-frame') {
            let sWidth;
            let sHeight;
            let dx;
            let dy;
            let dWidth;
            let dHeight;

            if (vm.meta.userData.rotated) {
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2;

                canvas.translate(centerX, centerY);
                canvas.rotate((-90 * Math.PI) / 180);
                canvas.translate(-centerX, -centerY);

                dx = centerX - vm._scalingSize.width / 2;
                dy = centerY - vm._scalingSize.height / 2;
                sWidth = vm.meta.userData.height;
                sHeight = vm.meta.userData.width;
                dWidth = canvasHeight;
                dHeight = canvasWidth;
            } else {
                dx = 0;
                dy = 0;
                sWidth = vm.meta.userData.width;
                sHeight = vm.meta.userData.height;
                dWidth = canvasWidth;
                dHeight = canvasHeight;
            }
            canvas.drawImage(
                vm._image,
                vm.meta.userData.trimX,
                vm.meta.userData.trimY,
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

export async function mounted() {
    // @ts-ignore
    this.loadImage();
}

export const watch = {
    meta: {
        deep: true,
        handler() {
            // @ts-ignore
            this.updateImage();
        },
    },
    imgSrc() {
        // @ts-ignore
        this.loadImage();
        // @ts-ignore
        this.updateImage();
    },
};

export function destroyed() {
    // @ts-ignore
    this._destroyed = true;
}

/**
 * 比对图片和容器的宽高返回合适的尺寸
 */
function getFitSize(imgWidth: number, imgHeight: number, boxWidth: number, boxHeight: number) {
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
