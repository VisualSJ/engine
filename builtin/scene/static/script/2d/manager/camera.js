'use strict';

const scales = [
    0.05, 0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 3, 4, 5
];

function createCamera() {
    const node = new cc.Node();
    node.is3DNode = true;
    const camera = node.addComponent(cc.Camera);
    camera._init();
    camera.nearClip = 0.1;
    camera.farClip = 100000;
    camera.ortho = true;
    return camera;
}

class Camrea {

    /**
     * 初始化摄像机并且挂到 renderer 上
     */
    init() {
        // 场景设计的宽度
        this.size = cc.size(640, 380);

        // 当前编辑器内缩放比例
        this.scale = 1;

        // 摄像机位置以及方向
        this.eye = cc.v3(0, 0, 0);
        this.up = cc.v3(0, 1, 0);
        this.position = cc.v3(0, 0, 100);

        // 拖拽的偏移量
        this.offset = cc.v3(0, 0, 0);

        // 摄像机节点
        this.camera = createCamera();
        cc.renderer.scene.addCamera(this.camera._camera);

        // 用于编辑器绘制的背景和前景节点
        this.foregroundNode = new cc.Node('Editor Scene Foreground');
        this.backgroundNode = new cc.Node('Editor Scene Background');

        // 编辑器使用的节点不需要存储和显示在层级管理器
        this.foregroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);
        this.backgroundNode._objFlags |= (cc.Object.Flags.DontSave | cc.Object.Flags.HideInHierarchy);

        // 设置背景和前景节点的排序
        this.foregroundNode.zIndex = cc.macro.MAX_ZINDEX;
        this.backgroundNode.zIndex = -cc.macro.MAX_ZINDEX;

        // 这些节点应该是常驻节点
        cc.game.addPersistRootNode(this.foregroundNode);
        cc.game.addPersistRootNode(this.backgroundNode);

        // 初始化画设计分辨率框的节点
        const wireframe = new cc.Node('Design Resolution');
        this.designResolutionCtx = wireframe.addComponent(cc.Graphics);
        wireframe.parent = this.backgroundNode;

        // 初始化绘制网格的节点
        let node = new cc.Node('Scene Grid 2D');
        this.gridCtx = node.addComponent(cc.Graphics);
        node.parent = this.backgroundNode;

        this.apply();
    }

    /**
     * 屏幕点击点转换到 canvas 内的像素点
     * @param {*} vec2
     */
    translatePoint(vec2) {
        const bcr = document.body.getBoundingClientRect();
        // 1. 屏幕中心到传入点的向量
        const point = cc.v2(
            (vec2.x - bcr.width / 2),
            (vec2.y - bcr.height / 2),
        );

        // 2. 向量在 canvas 内的实际值
        point.x /= camera.scale;
        point.y /= camera.scale;

        // 3. 实际 eye 位置计算出在 canvas 内的位置
        point.x = this.size.width / 2 + (-(camera.offset.x) + point.x);
        point.y = this.size.height / 2 + (-(camera.offset.y) - point.y);

        return point;
    }

    /**
     * 设置 canvas 的设计分辨率
     * @param {*} size
     */
    setSize(size) {
        this.size.width = size.width;
        this.size.height = size.height;
        this.apply();
    }

    /**
     * 设置引擎的适配模式
     */
    setPolicy() {
        const ProportionalToScene = cc.ContainerStrategy.extend({
            apply: function(view, designedResolution) {
                const frameW = view._frameSize.width;
                const frameH = view._frameSize.height;
                const containerStyle = cc.game.container.style;
                const designW = designedResolution.width;
                const designH = designedResolution.height;
                const scaleX = frameW / designW;
                const scaleY = frameH / designH;
                let containerW;
                let containerH;

                if (scaleX < scaleY) {
                    containerW = frameW;
                    containerH = designH * scaleX;
                } else {
                    containerW = designW * scaleY;
                    containerH = frameH;
                }

                // Adjust container size with integer value
                const offx = Math.round((frameW - containerW) / 2);
                const offy = Math.round((frameH - containerH) / 2);
                containerW = frameW - 2 * offx;
                containerH = frameH - 2 * offy;

                this._setupContainer(view, containerW, containerH);
                containerStyle.margin = '0';
            }
        });
        this.policy = new cc.ResolutionPolicy(new ProportionalToScene(), cc.ContentStrategy.SHOW_ALL);

        // 设置 canvas 大小
        const bcr = document.body.getBoundingClientRect();
        cc.view.setCanvasSize(bcr.width, bcr.height);
        cc.view.setDesignResolutionSize(bcr.width, bcr.height, this.policy);
    }

    /**
     * 应用摄像机参数，以及重绘边框网格
     */
    apply() {
        if (!this.camera) {
            return;
        }
        const bcr = document.body.getBoundingClientRect();
        const scale = this.scale || 0.05;
        const size = this.size;

        this.camera.orthoSize = bcr.height / 2 / scale;

        this.position = cc.v3(
            bcr.width / 2 - (bcr.width - size.width) / 2 - this.offset.x,
            bcr.height / 2 - (bcr.height - size.height) / 2 - this.offset.y,
            100,
        );
        this.eye = cc.v3(
            this.position.x,
            this.position .y,
            0,
        );

        this.camera.node.position = this.position;
        this.camera.node.lookAt(this.eye, this.up);
        this.camera._camera.dirty = true;
        this.camera.beforeDraw && this.camera.beforeDraw();

        // 更新设计分辨率框（框绘制的宽度在实际显示时始终要保持1像素）
        this.designResolutionCtx.strokeColor = cc.color('#AA00AA');
        this.designResolutionCtx.lineWidth = 1 / scale;
        this.designResolutionCtx.clear();
        this.designResolutionCtx.rect(0, 0, size.width, size.height);
        this.designResolutionCtx.stroke();

        ///////////
        // 绘制网格

        // 摄像机看到的左下角点的坐标
        const startPoint = {
            x: (bcr.width - size.width * this.scale) / 2 / this.scale + this.offset.x,
            y: (bcr.height - size.height * this.scale) / 2 / this.scale + this.offset.y,
        };

        const endPoint = {
            x: (bcr.width - size.width * this.scale) / 2 / this.scale - this.offset.x + size.width,
            y: (bcr.height - size.height * this.scale) / 2 / this.scale - this.offset.y + size.height,
        };

        this.gridCtx.lineWidth = 1 / scale;
        this.gridCtx.clear();

        const spacing = (1 << 1 /  Math.sqrt(this.scale)) * 20;
        const num = Math.floor((Math.sqrt(this.scale) / 0.5 % 1) * 5) + 1;

        // 单数索引的竖线
        let ox = -Math.floor(startPoint.x / spacing) * spacing;

        if (ox / spacing % 2) {
            this.gridCtx.strokeColor = cc.color().fromHEX(`0x${num}${num}${num}${num}${num}${num}`);
        } else {
            this.gridCtx.strokeColor = cc.color().fromHEX(`0x555555`);
        }
        while (ox < endPoint.x) {
            this.gridCtx.moveTo(ox, -startPoint.y);
            this.gridCtx.lineTo(ox, endPoint.y);
            ox += spacing * 2;
        }
        this.gridCtx.stroke();

        // 单数索引的横线
        let oy = -Math.floor(startPoint.y / spacing) * spacing;

        if (oy / spacing % 2) {
            this.gridCtx.strokeColor = cc.color().fromHEX(`0x${num}${num}${num}${num}${num}${num}`);
        } else {
            this.gridCtx.strokeColor = cc.color().fromHEX(`0x555555`);
        }

        while (oy < endPoint.y) {
            this.gridCtx.moveTo(-startPoint.x, oy);
            this.gridCtx.lineTo(endPoint.x, oy);
            oy += spacing * 2;
        }

        this.gridCtx.stroke();

        // 双数索引的竖线
        ox = -Math.floor(startPoint.x / spacing) * spacing;

        if (ox / spacing % 2) {
            this.gridCtx.strokeColor = cc.color().fromHEX(`0x555555`);
        } else {
            this.gridCtx.strokeColor = cc.color().fromHEX(`0x${num}${num}${num}${num}${num}${num}`);
        }

        while (ox < endPoint.x) {
            this.gridCtx.moveTo(ox + spacing, -startPoint.y);
            this.gridCtx.lineTo(ox + spacing, endPoint.y);
            ox += spacing * 2;
        }
        this.gridCtx.stroke();

        // 双数索引的横线
        oy = -Math.floor(startPoint.y / spacing) * spacing;

        if (oy / spacing % 2) {
            this.gridCtx.strokeColor = cc.color().fromHEX(`0x555555`);
        } else {
            this.gridCtx.strokeColor = cc.color().fromHEX(`0x${num}${num}${num}${num}${num}${num}`);
        }

        while (oy < endPoint.y) {
            this.gridCtx.moveTo(-startPoint.x, oy + spacing);
            this.gridCtx.lineTo(endPoint.x, oy + spacing);
            oy += spacing * 2;
        }
        this.gridCtx.stroke();
    }

    /**
     * 将场景调整到窗口正中间
     * @param {*} margin
     */
    adjustToCenter(margin) {
        const bcr = document.body.getBoundingClientRect();
        const size = this.size;

        if (size.width / size.height < (bcr.width - 1) / (bcr.height - 1)) {
            // height
            this.scale = (bcr.height - 1 - margin * 2) / size.height;
        } else {
            // width
            this.scale = (bcr.width - 1 - margin * 2) / size.width;
        }

        this.apply();
    }
}

const camera = module.exports = new Camrea();

document.addEventListener('mousewheel', (event) => {
    let scale = Math.pow(2, event.wheelDelta * 0.002) * camera.scale;
    if (scale < 0.05) {
        scale = 0.05;
    } else if (scale > 5) {
        scale = 5;
    }

    const point = {
        x: event.pageX,
        y: event.pageY,
    };

    // 缩放前点击的 canvas 实际点
    const point1 = camera.translatePoint(point);
    camera.scale = scale;
    // 缩放后点击的 canvas 实际点
    const point2 = camera.translatePoint(point);

    // 根据鼠标位置计算缩放后视角的偏移量
    camera.offset.x -= point1.x - point2.x;
    camera.offset.y -= point1.y - point2.y;

    camera.apply();
});

document.addEventListener('mousedown', (event) => {
    const position = { x: event.pageX, y: event.pageY };

    const move = (event) => {
        const offsetX = event.pageX - position.x;
        const offsetY = event.pageY - position.y;

        camera.offset.x += offsetX / camera.scale;
        camera.offset.y -= offsetY / camera.scale;

        position.x = event.pageX;
        position.y = event.pageY;

        camera.apply();
    };

    const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
});

window.addEventListener('resize', () => {
    if (!window.cc) {
        return;
    }

    const bcr = document.body.getBoundingClientRect();
    cc.view.setCanvasSize(bcr.width, bcr.height);
    cc.view.setDesignResolutionSize(bcr.width, bcr.height, camera.policy);

    camera.apply();
});
