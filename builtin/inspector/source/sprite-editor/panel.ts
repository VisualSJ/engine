'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');
const { T, getFitSize } = require('../../static/utils');

Vue.config.productionTip = false;
Vue.config.devtools = false;

let panel: any = null;
let vm: any = null;

export const style = readFileSync(join(__dirname, '../index.css'));

export const template = readFileSync(
    join(__dirname, '../../static', '/template/sprite-editor.html')
);

/**
 * 配置 inspector 的 iconfont 图标
 */
export const fonts = [
    {
        name: 'inspector',
        file: 'packages://inspector/static/iconfont.woff',
    },
];

export const $ = { content: '.sprite-editor' };

export const messages = {
    'current-uuid'(uuid: string) {
        vm && (vm.uuid = uuid);
    },
};

export const listeners = {
    resize() {
        vm && vm.windowResizeListener();
    },
};

export async function ready() {
    Editor.Ipc.sendToPackage(
        'inspector',
        'sprite-editor-state',
        true
    );
    // @ts-ignore
    panel = this;

    // 初始化 vue
    vm = new Vue({
        el: panel.$.content,

        data: {
            image: null,
            meta: null,
            uuid: '',
            scale: 50,
            minScale: 0,
            maxScale: 100,
            leftPos: 0,
            rightPos: 0,
            topPos: 0,
            bottomPos: 0,
        },

        async mounted() {
            const uuid = await Editor.Ipc.requestToPackage(
                'inspector',
                'get-sprite-editor-uuid'
            );
            this._textureUuid = uuid.replace('@sprite-frame', '');
            this.uuid = uuid;
        },
        watch: {
            uuid(this: any, newVal: string, oldVal: string) {
                if (newVal !== oldVal) {
                    this._textureUuid = newVal.replace(
                        '@sprite-frame',
                        ''
                    );
                    this.openSprite();
                }
            },
            scale(this: any, newVal: number, oldVal: number) {
                if (this.enabled) {
                    if (newVal > this.maxScale) {
                        this.scale = this.maxScale;
                    }
                    if (newVal < this.minScale) {
                        this.scale = this.minScale;
                    }
                    this.resize(
                        (this.meta.userData.width * this.scale) / 100,
                        (this.meta.userData.height * this.scale) / 100
                    );
                }
            },
        },
        computed: {
            dynamicComponent(this: any) {
                if (this.enabled) {
                    return 'ui-slider';
                }
                return null;
            },
            enabled(this: any): boolean {
                return [this.image, this.meta].some((item) => !!item);
            },
            leftZIndex(this: any) {
                if (this.enabled) {
                    if (
                        this.leftPos + this.rightPos >=
                        this.image.width &&
                        this.leftPos === this.image.width
                    ) {
                        return true;
                    }
                }
                return false;
            },
            topZIndex(this: any) {
                if (this.enabled) {
                    if (
                        this.topPos + this.bottomPos >=
                        this.image.height &&
                        this.topPos === this.image.height
                    ) {
                        return true;
                    }
                }
                return false;
            },
            isDirty(this: any) {
                if (this.enabled) {
                    const isLeftDirty =
                        this.leftPos !==
                        this.meta.userData.borderLeft;
                    const isRightDirty =
                        this.rightPos !==
                        this.meta.userData.borderRight;
                    const isTopDirty =
                        this.topPos !== this.meta.userData.borderTop;
                    const isBottomDirty =
                        this.bottomPos !==
                        this.meta.userData.borderBottom;

                    return (
                        isLeftDirty ||
                        isRightDirty ||
                        isTopDirty ||
                        isBottomDirty
                    );
                }
                return false;
            },
        },
        methods: {
            T,

            async openSprite(this: any) {
                if (!this.uuid) {
                    return;
                }

                const [texture, meta] = await Promise.all([
                    Editor.Ipc.requestToPackage(
                        'asset-db',
                        'query-asset-meta',
                        this._textureUuid
                    ),
                    Editor.Ipc.requestToPackage(
                        'asset-db',
                        'query-asset-meta',
                        this.uuid
                    ),
                ]);

                if (meta && texture) {
                    if (meta.importer !== 'sprite-frame') {
                        return;
                    }
                    this.meta = meta;
                    this.refreshScaleSlider();

                    let src = join(
                        Editor.Project.path,
                        'library',
                        texture.uuid.substr(0, 2),
                        texture.uuid
                    );
                    src += texture.files.filter(
                        (file: string) => !file.includes('json')
                    )[0];

                    this.loadImage(src);
                }
            },

            loadImage(this: any, src: string) {
                this.image = new Image();
                this.image.onload = () => {
                    this.resize(
                        (this.meta.userData.width * this.scale) / 100,
                        (this.meta.userData.height * this.scale) / 100
                    );
                    this.loadSlider = true;
                };
                this.image.src = src;
            },

            resize(
                this: any,
                imageWidth: number,
                imageHeight: number
            ) {
                const {
                    width: boxWidth,
                    height: boxHeight,
                } = this.$refs.container.getBoundingClientRect();
                const [width, height] = getFitSize(
                    imageWidth,
                    imageHeight,
                    boxWidth,
                    boxHeight
                );

                if (this.meta.userData.rotated) {
                    this._scalingSize = {
                        width: Math.ceil(height),
                        height: Math.ceil(width),
                    };
                }

                this.$refs.canvas.width = Math.ceil(width);
                this.$refs.handles.style.width = `${Math.ceil(width) +
                    1}px`;
                this.$refs.canvas.height = Math.ceil(height);
                this.$refs.handles.style.height = `${Math.ceil(
                    height
                ) + 1}px`;

                this.repaint();
            },

            repaint(this: any) {
                const canvas = this.$refs.canvas.getContext('2d');
                const canvasWidth = this.$refs.canvas.width;
                const canvasHeight = this.$refs.canvas.height;

                let sWidth: number;
                let sHeight: number;
                let dx: number;
                let dy: number;
                let dWidth: number;
                let dHeight: number;

                canvas.imageSmoothingEnabled = false;
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
                    this.image,
                    this.meta.userData.trimX,
                    this.meta.userData.trimY,
                    sWidth,
                    sHeight,
                    dx,
                    dy,
                    dWidth,
                    dHeight
                );
            },

            refreshScaleSlider(this: any) {
                const {
                    width,
                    height,
                } = this.$refs.container.getBoundingClientRect();
                const {
                    width: imageWidth,
                    height: imageHeight,
                } = this.meta.userData;

                const { width: prevWidth, height: prevHeight } = this
                    ._boundary || { width: 0, height: 0 };

                if (
                    prevWidth &&
                    prevWidth === width &&
                    prevHeight === height
                ) {
                    return;
                }
                let scale;
                if (imageWidth > imageHeight) {
                    scale = (width / imageWidth) * 100;
                } else {
                    scale = (height / imageHeight) * 100;
                }

                this.minScale = Math.ceil(scale / 5);
                this.maxScale = Math.floor(scale);
                this.scale = Math.ceil((scale + this.minScale) / 2);
                this._boundary = { width, height };
            },

            onSliderChanged(this: any, event: any) {
                if (this.enabled) {
                    this.scale = event.target.value;
                    const imageWidth =
                        (this.meta.userData.width * this.scale) / 100;
                    const imageHeight =
                        (this.meta.userData.height * this.scale) /
                        100;
                    this.resize(imageWidth, imageHeight);
                }
            },

            windowResizeListener(this: any) {
                if (this.enabled) {
                    this.refreshScaleSlider();
                    const imageWidth =
                        (this.meta.userData.width * this.scale) / 100;
                    const imageHeight =
                        (this.meta.userData.height * this.scale) /
                        100;
                    this.resize(imageWidth, imageHeight);
                }
            },

            onMouseWheel(this: any, event: any) {
                if (this.enabled) {
                    event.stopPropagation();
                    const { wheelDelta } = event;
                    const scale =
                        (this.scale / 100) *
                        Math.pow(2, 0.002 * wheelDelta);

                    this.scale = Math.ceil(scale * 100);
                }
            },

            onMouseDown(this: any, event: any) {
                if (
                    this._dragTarget ||
                    !event.target.classList.contains('handle')
                ) {
                    return;
                }
                this._dragTarget = event.target;
                this._startX = event.clientX;
                this._startY = event.clientY;
                this._startLeftPos = this.leftPos;
                this._startRightPos = this.rightPos;
                this._startTopPos = this.topPos;
                this._startBottomPos = this.bottomPos;

                document.addEventListener(
                    'mousemove',
                    this.onMouseMove
                );
                document.addEventListener('mouseup', this.onMouseUp);
            },

            onMouseMove(this: any, event: any) {
                if (this._dragTarget) {
                    const { target } = event;
                    const scale = this.scale / 100;
                    const deltaX =
                        (event.clientX - this._startX) / scale;
                    const deltaY =
                        (event.clientY - this._startY) / scale;

                    const moveX =
                        deltaX > 0
                            ? Math.floor(deltaX)
                            : Math.ceil(deltaX);
                    const moveY =
                        deltaY > 0
                            ? Math.floor(deltaY)
                            : Math.ceil(deltaY);

                    if (Math.abs(moveX) > 0) {
                        if (
                            this._dragTarget.classList.contains(
                                'left'
                            )
                        ) {
                            const newLeftValue =
                                this._startLeftPos + moveX;
                            this.leftPos = this.correctPosValue(
                                newLeftValue,
                                0,
                                this.image.width - this.rightPos
                            );
                        }

                        if (
                            this._dragTarget.classList.contains(
                                'right'
                            )
                        ) {
                            const newRightValue =
                                this._startRightPos - moveX;
                            this.rightPos = this.correctPosValue(
                                newRightValue,
                                0,
                                this.image.width - this.leftPos
                            );
                        }
                    }
                    if (Math.abs(moveY) > 0) {
                        if (
                            this._dragTarget.classList.contains('top')
                        ) {
                            const newTopValue =
                                this._startTopPos + moveY;
                            this.topPos = this.correctPosValue(
                                newTopValue,
                                0,
                                this.image.height - this.bottomPos
                            );
                        }

                        if (
                            this._dragTarget.classList.contains(
                                'bottom'
                            )
                        ) {
                            const newBottomValue =
                                this._startBottomPos - moveY;
                            this.bottomPos = this.correctPosValue(
                                newBottomValue,
                                0,
                                this.image.height - this.topPos
                            );
                        }
                    }
                }
            },

            onMouseUp(this: any, event: any) {
                document.removeEventListener(
                    'mousemove',
                    this.onMouseMove
                );
                document.removeEventListener(
                    'mouseup',
                    this.onMouseUp
                );

                this._dragTarget = false;
            },

            correctPosValue(value: number, min: number, max: number) {
                if (value > max) {
                    return max;
                }
                if (value < min) {
                    return min;
                }
                return value;
            },

            onInputConfirm(
                this: any,
                event: any,
                min: number,
                max: number
            ) {
                const { target } = event;
                const path = target.getAttribute('path');
                const val = this.correctPosValue(
                    target.value,
                    min,
                    max
                );
                target.value = val;
                this[path] = val;
            },

            async onApply(this: any) {
                if (this.enabled) {
                    const {
                        borderLeft,
                        borderRight,
                        borderTop,
                        borderBottom,
                    } = this.meta.userData;

                    const { userData } = this.meta;
                    userData.borderLeft = this.leftPos;
                    userData.borderRight = this.rightPos;
                    userData.borderTop = this.topPos;
                    userData.borderBottom = this.bottomPos;

                    const meta = JSON.stringify(this.meta);
                    let result = false;
                    try {
                        // todo asset-db error
                        result = await Editor.Ipc.sendToPackage(
                            'asset-db',
                            'save-asset-meta',
                            this.uuid,
                            meta
                        );
                    } catch (err) {
                        result = false;
                    } finally {
                        if (!result) {
                            this.leftPos = borderLeft;
                            this.rightPos = borderRight;
                            this.topPos = borderTop;
                            this.bottomPos = borderBottom;

                            userData.borderLeft = borderLeft;
                            userData.borderRight = borderRight;
                            userData.borderTop = borderTop;
                            userData.borderBottom = borderBottom;
                        }
                    }
                }
            },

            onRevert(this: any) {
                if (this.enabled) {
                    const {
                        borderLeft,
                        borderRight,
                        borderTop,
                        borderBottom,
                    } = this.meta.userData;
                    this.leftPos = borderLeft;
                    this.rightPos = borderRight;
                    this.topPos = borderTop;
                    this.bottomPos = borderBottom;
                }
            },
        },
    });
}

export async function beforeClose() { }

export async function close() {
    Editor.Ipc.sendToPackage(
        'inspector',
        'sprite-editor-state',
        false
    );
}
