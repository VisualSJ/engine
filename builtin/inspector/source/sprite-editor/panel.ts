'use strict';

import { readFileSync } from 'fs';
import { join } from 'path';

const Vue = require('vue/dist/vue.js');
const SVG = require('svg.js');
const Chroma = require('chroma-js');

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
        file: 'packages://inspector/static/style/imports/iconfont.woff',
    },
];

export const $ = {
    content: '.sprite-editor',
};

export const messages = {
    'current-keys'(data: any) {
        if (vm && data) {
            vm.uuid = data.uuid;
            vm.subAssetUuid = data.subAssetUuid;
        }
    },
};

export const listeners = {
    resize() {
        vm.resize(vm.meta.width * vm.scale / 100, vm.meta.height * vm.scale / 100);
        vm.refreshScaleSlider();
    },
};

export async function ready() {

    // @ts-ignore
    panel = this;

    // 初始化 vue
    vm = new Vue({
        el: panel.$.content,
        data: {
            uuid: '',
            subAssetUuid: '',
            svg: null,
            lastBcr: null,
            svgColor: '#5c5',
            dotSize: 6,
            borderLeft: 0,
            borderRight: 0,
            borderBottom: 0,
            borderTop: 0,

            leftPos: 0,
            rightPos: 0,
            topPos: 0,
            bottomPos: 0,

            startLeftPos: 0,
            startRightPos: 0,
            startTopPos: 0,
            startBottomPos: 0,
            meta: null,
            scalingSize: null,

            scale: 100,
            minScale: 10,
            maxScale: 1000,
            dirty: false,
        },
        watch: {
            uuid() {
                if (vm.uuid) {
                    vm.openSprite(vm.uuid);
                }
            },
            scale() {
                vm.resize(vm.meta.width * vm.scale / 100, vm.meta.height * vm.scale / 100);
            },
            leftPos() {
                vm.leftPosChanged();
            },
            rightPos() {
                vm.rightPosChanged();
            },
            topPos() {
                vm.topPosChanged();
            },
            bottomPos() {
                vm.bottomPosChanged();
            },
        },
        mounted() {
            this.svg = SVG(this.$refs.svg);
            this.svg.spof();

            this.refreshScaleSlider();
        },
        methods: {
            t(key: string): string {
                return Editor.I18n.t(`inspector.sprite_editor.${key}`);
            },
            resize(width: number, height: number) {
                if (!vm.image && !vm.meta) {
                    return;
                }
                const bcr = vm.$root.$el.getBoundingClientRect();
                const result = getFitSize(width, height, bcr.width, bcr.height);

                if (vm.meta.rotated) {
                    vm.scalingSize = {
                        width: Math.ceil(result[1]),
                        height: Math.ceil(result[0]),
                    };
                }

                vm.$refs.canvas.width = Math.ceil(result[0]);
                vm.$refs.canvas.height = Math.ceil(result[1]);

                vm.repaint();
            },
            refreshScaleSlider() {
                // @ts-ignore
                const vm = this;
                // @ts-ignore
                const $scale = vm.$refs.scale;
                // @ts-ignore
                $scale.min = vm.minScale;
                // @ts-ignore
                $scale.max = vm.maxScale;
                // @ts-ignore
                $scale.value = vm.scale;
            },
            scaleChange() {
                if (!vm.image || !vm.meta) {
                    return;
                }

                vm.scale = vm.$refs.scale.value;
            },
            async openSprite() {
                const { userData } = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-meta', vm.subAssetUuid);
                vm.meta = userData;
                vm.leftPos = userData.borderLeft;
                vm.rightPos = userData.borderRight;
                vm.topPos = userData.borderTop;
                vm.bottomPos = userData.borderBottom;

                const info = await Editor.Ipc.requestToPackage('asset-db', 'query-asset-info', vm.uuid);
                const key = Object.keys(info.library).find((key) => key !== '.json');
                if (!key) {
                    return '';
                }

                vm.image = new Image();
                vm.image.src = info.library[key];
                vm.image.onload = () => {
                    vm.resize(vm.meta.width * vm.scale / 100, vm.meta.height * vm.scale / 100);
                };
            },
            repaint() {
                const ctx = vm.$refs.canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;

                const meta = vm.meta;
                let canvasWidth = vm.$refs.canvas.width;
                let canvasHeight = vm.$refs.canvas.height;
                let xPos;
                let yPos;
                let trimWidth;
                let trimHeight;
                if (meta.rotated) {
                    const tempXPos = canvasWidth / 2;
                    const tempYPos = canvasHeight / 2;
                    ctx.translate(tempXPos, tempYPos);
                    ctx.rotate(-90 * Math.PI / 180);
                    ctx.translate(-tempXPos, -tempYPos);

                    xPos = canvasWidth / 2 - vm.scalingSize.width / 2;
                    yPos = canvasHeight / 2 - vm.scalingSize.height / 2;
                    trimWidth = meta.height;
                    trimHeight = meta.width;
                    canvasWidth = vm.$refs.canvas.height;
                    canvasHeight = vm.$refs.canvas.width;
                } else {
                    xPos = 0;
                    yPos = 0;
                    trimWidth = meta.width;
                    trimHeight = meta.height;
                    canvasWidth = vm.$refs.canvas.width;
                    canvasHeight = vm.$refs.canvas.height;
                }

                ctx.drawImage(
                    vm.image,
                    meta.trimX, meta.trimY, trimWidth, trimHeight,
                    xPos, yPos, canvasWidth, canvasHeight
                );

                vm.drawEditElements();
            },
            drawEditElements() {
                if (!vm.image) {
                    return;
                }

                vm.svg.clear();
                const bcr = vm.getCanvasRect();
                vm.updateBorderPos(bcr);

                // 4个边
                vm.lineLeft = vm.drawLine(vm.borderLeft, bcr.bottom, vm.borderLeft, bcr.top, 'l');
                vm.lineRight = vm.drawLine(vm.borderRight, bcr.bottom, vm.borderRight, bcr.top, 'r');
                vm.lineTop = vm.drawLine(bcr.left, vm.borderTop, bcr.right, vm.borderTop, 't');
                vm.lineBottom = vm.drawLine(bcr.left, vm.borderBottom, bcr.right, vm.borderBottom, 'b');

                // 4个交点
                vm.dotLB = vm.drawDot(vm.borderLeft, vm.borderBottom, 'lb');
                vm.dotLT = vm.drawDot(vm.borderLeft, vm.borderTop, 'lt');
                vm.dotRB = vm.drawDot(vm.borderRight, vm.borderBottom, 'rb');
                vm.dotRT = vm.drawDot(vm.borderRight, vm.borderTop, 'rt');

                // 4个边的中点
                vm.dotL = vm.drawDot(vm.borderLeft, bcr.bottom - bcr.height / 2, 'l');
                vm.dotR = vm.drawDot(vm.borderRight, bcr.bottom - bcr.height / 2, 'r');
                vm.dotB = vm.drawDot(bcr.left + bcr.width / 2, vm.borderBottom, 'b');
                vm.dotT = vm.drawDot(bcr.left + bcr.width / 2, vm.borderTop, 't');
            },
            getCanvasRect() {
                const ret: any = {};
                ret.top = vm.$refs.canvas.offsetTop;
                ret.left = vm.$refs.canvas.offsetLeft;
                ret.bottom = vm.$refs.canvas.offsetTop + vm.$refs.canvas.height;
                ret.right = vm.$refs.canvas.offsetLeft + vm.$refs.canvas.width;
                ret.width = vm.$refs.canvas.width;
                ret.height = vm.$refs.canvas.height;

                return ret;
            },
            updateBorderPos(bcr: any) {
                vm.borderLeft = bcr.left + vm.leftPos * (vm.scale / 100);
                vm.borderRight = bcr.right - vm.rightPos * (vm.scale / 100);
                vm.borderTop = bcr.top + vm.topPos * (vm.scale / 100);
                vm.borderBottom = bcr.bottom - vm.bottomPos * (vm.scale / 100);
            },
            // @ts-ignore
            drawLine(startX, startY, endX, endY, lineID) {
                const start = { x: startX, y: startY };
                const end = { x: endX, y: endY };
                const line = lineTool(vm.svg, start, end, vm.svgColor, 'default', vm.svgCallbacks(lineID));
                if (lineID === 'l' || lineID === 'r') {
                    line.style('cursor', 'col-resize');
                } else if (lineID === 't' || lineID === 'b') {
                    line.style('cursor', 'row-resize');
                }
                return line;
            },
            // @ts-ignore
            drawDot(posX, posY, dotID) {
                const attr = { color: vm.svgColor };
                // @ts-ignore
                const theDot = circleTool(vm.svg, vm.dotSize, attr, attr, vm.svgCallbacks(dotID));
                if (dotID === 'l' || dotID === 'r' || dotID === 't' || dotID === 'b') {
                    theDot.style('cursor', 'pointer');
                } else if (dotID === 'lb' || dotID === 'rt') {
                    theDot.style('cursor', 'nesw-resize');
                } else if (dotID === 'rb' || dotID === 'lt') {
                    theDot.style('cursor', 'nwse-resize');
                }
                vm.moveDotTo(theDot, posX, posY);
                return theDot;
            },
            // @ts-ignore
            moveDotTo(dot, posX, posY) {
                if (dot) {
                    dot.move(posX, posY);
                }
            },
            // @ts-ignore
            svgCallbacks(svgId) {
                const callbacks = {};
                // @ts-ignore
                callbacks.start = () => {
                    vm.startLeftPos = vm.leftPos;
                    vm.startRightPos = vm.rightPos;
                    vm.startTopPos = vm.topPos;
                    vm.startBottomPos = vm.bottomPos;
                };

                // @ts-ignore
                callbacks.update = (dx, dy) => {
                    vm.svgElementMoved(svgId, dx, dy);
                };

                return callbacks;
            },
            // @ts-ignore
            svgElementMoved(id, dx, dy) {
                let movedX = dx / (vm.scale / 100);
                let movedY = dy / (vm.scale / 100);
                if (movedX > 0) {
                    movedX = Math.floor(movedX);
                } else {
                    movedX = Math.ceil(movedX);
                }

                if (movedY > 0) {
                    movedY = Math.floor(movedY);
                } else {
                    movedY = Math.ceil(movedY);
                }

                if (Math.abs(movedX) > 0) {
                    if (id.indexOf('l') >= 0) {
                        const newLeftValue = vm.startLeftPos + movedX;
                        vm.leftPos = vm.correctPosValue(newLeftValue, 0, vm.image.width - vm.rightPos);
                    }
                    if (id.indexOf('r') >= 0) {
                        const newRightValue = vm.startRightPos - movedX;
                        vm.rightPos = vm.correctPosValue(newRightValue, 0, vm.image.width - vm.leftPos);
                    }
                }

                if (Math.abs(movedY) > 0) {
                    if (id.indexOf('t') >= 0) {
                        const newTopValue = vm.startTopPos + movedY;
                        vm.topPos = vm.correctPosValue(newTopValue, 0, vm.image.height - vm.bottomPos);
                    }
                    if (id.indexOf('b') >= 0) {
                        const newBottomValue = vm.startBottomPos - movedY;
                        vm.bottomPos = vm.correctPosValue(newBottomValue, 0, vm.image.height - vm.topPos);
                    }
                }
            },
            // @ts-ignore
            correctPosValue(newValue, min, max) {
                if (newValue < min) {
                    return min;
                }

                if (newValue > max) {
                    return max;
                }

                return newValue;
            },
            checkState() {
                const leftDirty = vm.leftPos !== vm.meta.borderLeft;
                const rightDirty = vm.rightPos !== vm.meta.borderRight;
                const topDirty = vm.topPos !== vm.meta.borderTop;
                const bottomDirty = vm.bottomPos !== vm.meta.borderBottom;

                vm.dirty = leftDirty || rightDirty || topDirty || bottomDirty;
            },
            leftPosChanged() {
                if (!vm.image) {
                    return;
                }

                const bcr = this.getCanvasRect();
                this.updateBorderPos(bcr);

                // move dots
                this.moveDotTo(vm.dotL, vm.borderLeft, bcr.bottom - bcr.height / 2);
                this.moveDotTo(vm.dotLB, vm.borderLeft, vm.borderBottom);
                this.moveDotTo(vm.dotLT, vm.borderLeft, vm.borderTop);

                // move line left
                if (vm.lineLeft) {
                    vm.lineLeft.plot(vm.borderLeft, bcr.bottom, vm.borderLeft, bcr.top);
                }

                this.checkState();
            },
            rightPosChanged() {
                if (!vm.image) {
                    return;
                }

                const bcr = this.getCanvasRect();
                this.updateBorderPos(bcr);

                // move dots
                this.moveDotTo(vm.dotR, vm.borderRight, bcr.bottom - bcr.height / 2);
                this.moveDotTo(vm.dotRB, vm.borderRight, vm.borderBottom);
                this.moveDotTo(vm.dotRT, vm.borderRight, vm.borderTop);

                // move line left
                if (vm.lineRight) {
                    vm.lineRight.plot(vm.borderRight, bcr.bottom, vm.borderRight, bcr.top);
                }

                this.checkState();
            },
            topPosChanged() {
                if (!vm.image) {
                    return;
                }

                const bcr = this.getCanvasRect();
                this.updateBorderPos(bcr);

                // move dots
                this.moveDotTo(vm.dotT, bcr.left + bcr.width / 2, vm.borderTop);
                this.moveDotTo(vm.dotLT, vm.borderLeft, vm.borderTop);
                this.moveDotTo(vm.dotRT, vm.borderRight, vm.borderTop);

                // move line top
                if (vm.lineTop) {
                    vm.lineTop.plot(bcr.left, vm.borderTop, bcr.right, vm.borderTop);
                }

                this.checkState();
            },
            bottomPosChanged() {
                if (!vm.image) {
                    return;
                }

                const bcr = this.getCanvasRect();
                this.updateBorderPos(bcr);

                // move dots
                this.moveDotTo(vm.dotB, bcr.left + bcr.width / 2, vm.borderBottom);
                this.moveDotTo(vm.dotLB, vm.borderLeft, vm.borderBottom);
                this.moveDotTo(vm.dotRB, vm.borderRight, vm.borderBottom);

                // move line bottom
                if (vm.lineBottom) {
                    vm.lineBottom.plot(bcr.left, vm.borderBottom, bcr.right, vm.borderBottom);
                }

                this.checkState();
            },
            positionChange(event: any, key: string) {
                vm[key] = event.target.value;
            },
        },
    });

    vm.uuid = 'e6663d9e-79e5-49ad-b3d1-7d01c120c1e1';
    vm.subAssetUuid = 'e6663d9e-79e5-49ad-b3d1-7d01c120c1e1@a-1';

    Editor.Ipc.sendToPanel('inspector', 'sprite:state', true);
}

export async function beforeClose() { }

export async function close() {
    Editor.Ipc.sendToPanel('inspector', 'sprite:state', false);
}

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

// @ts-ignore
function circleTool(svg, size, fill, stroke, cursor, callbacks) {
    if (typeof cursor !== 'string') {
        callbacks = cursor;
        cursor = 'default';
    }

    const group = svg.group()
        .style('cursor', cursor)
        .fill(fill ? fill : 'none')
        .stroke(stroke ? stroke : 'none');

    const circle = group.circle().radius(size / 2);

    // @ts-ignore
    let bgCircle;
    if (stroke) {
        bgCircle = group.circle()
            .stroke({ width: 8 })
            .fill('none')
            .style('stroke-opacity', 0)
            .radius(size / 2);
    }

    let dragging = false;

    group.style('pointer-events', 'bounding-box');

    group.on('mouseover', () => {
        if (fill) {
            const lightColor = Chroma(fill.color).brighter().hex();
            group.fill({ color: lightColor });
        }

        if (stroke) {
            const lightColor = Chroma(stroke.color).brighter().hex();
            group.stroke({ color: lightColor });
        }

    });

    // @ts-ignore
    group.on('mouseout', (event) => {
        event.stopPropagation();

        if (!dragging) {
            if (fill) { group.fill(fill); }
            if (stroke) { group.stroke(stroke); }
        }
    });

    addMoveHandles(group, { cursor }, {
        // @ts-ignore
        start(x, y, event) {
            dragging = true;

            if (fill) {
                const superLightColor = Chroma(fill.color).brighter().brighter().hex();
                group.fill({ color: superLightColor });
            }

            if (stroke) {
                const superLightColor = Chroma(stroke.color).brighter().brighter().hex();
                group.stroke({ color: superLightColor });
            }

            if (callbacks.start) {
                callbacks.start(x, y, event);
            }
        },

        // @ts-ignore
        update(dx, dy, event) {
            if (callbacks.update) {
                callbacks.update(dx, dy, event);
            }
        },

        // @ts-ignore
        end(event) {
            dragging = false;

            if (fill) { group.fill(fill); }
            if (stroke) { group.stroke(stroke); }

            if (callbacks.end) {
                callbacks.end(event);
            }
        },
    });

    // @ts-ignore
    group.radius = function(radius) {
        circle.radius(radius);
        // @ts-ignore
        if (bgCircle) { bgCircle.radius(radius); }

        return this;
    };

    // @ts-ignore
    group.cx = function(x) {
        return this.x(x);
    };

    // @ts-ignore
    group.cy = function(y) {
        return this.y(y);
    };

    return group;
}

// @ts-ignore
function lineTool(svg, from, to, color, cursor, callbacks) {
    const group = svg.group().style('cursor', cursor).stroke({ color });
    const line = group.line(from.x, from.y, to.x, to.y)
        .style('stroke-width', 1);
    // used for hit test
    const bgline = group.line(from.x, from.y, to.x, to.y)
        .style('stroke-width', 8)
        .style('stroke-opacity', 0);

    let dragging = false;

    // @ts-ignore
    group.on('mouseover', () => {
        const lightColor = Chroma(color).brighter().hex();
        group.stroke({ color: lightColor });
    });

    // @ts-ignore
    group.on('mouseout', (event) => {
        event.stopPropagation();

        if (!dragging) {
            group.stroke({ color });
        }
    });

    addMoveHandles(group, { cursor }, {
        // @ts-ignore
        start(x, y, event) {
            dragging = true;

            const superLightColor = Chroma(color).brighter().brighter().hex();
            group.stroke({ color: superLightColor });

            if (callbacks.start) {
                callbacks.start(x, y, event);
            }
        },

        // @ts-ignore
        update(dx, dy, event) {
            if (callbacks.update) {
                callbacks.update(dx, dy, event);
            }
        },

        // @ts-ignore
        end(event) {
            dragging = false;
            group.stroke({ color });

            if (callbacks.end) {
                callbacks.end(event);
            }
        },
    });

    group.plot = function() {
        line.plot.apply(line, arguments);
        bgline.plot.apply(bgline, arguments);

        return this;
    };

    return group;
}
// @ts-ignore
function addMoveHandles(gizmo, opts, callbacks) {
    // @ts-ignore
    let pressx;
    // @ts-ignore
    let pressy;

    if (arguments.length === 2) {
        callbacks = opts;
        opts = {};
    }

    // @ts-ignore
    function mousemoveHandle(event) {
        event.stopPropagation();
        // @ts-ignore
        const dx = event.clientX - pressx;
        // @ts-ignore
        const dy = event.clientY - pressy;
        if (callbacks.update) {
            callbacks.update.call(gizmo, dx, dy, event);
        }
    }

    // @ts-ignore
    function mouseupHandle(event) {
        document.removeEventListener('mousemove', mousemoveHandle);
        document.removeEventListener('mouseup', mouseupHandle);

        if (callbacks.end) {
            callbacks.end.call(gizmo, event);
        }

        event.stopPropagation();
    }

    // @ts-ignore
    gizmo.on('mousedown', (event) => {
        if (event.which === 1) {
            pressx = event.clientX;
            pressy = event.clientY;

            document.addEventListener('mousemove', mousemoveHandle);
            document.addEventListener('mouseup', mouseupHandle);

            if (callbacks.start) {
                callbacks.start.call(gizmo, event.offsetX, event.offsetY, event);
            }
        }
        event.stopPropagation();
    });
}
