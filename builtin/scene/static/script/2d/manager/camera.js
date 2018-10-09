'use strict';

const scales = [
    0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 3, 4, 5
];

class Camrea {

    /**
     * 初始化摄像机并且挂到 renderer 上
     */
    init() {
        this.eye = cc.v3();
        this.up = cc.v3();
        this.position = cc.v3();

        const node = new cc.Node();
        node.is3DNode = true;

        const camera = node.addComponent(cc.Camera);
        camera._init();
        camera.nearClip = 0.1;
        camera.farClip = 100000;
        cc.renderer.scene.addCamera(camera._camera);

        this.camera = camera;
    }

    apply() {
        // this.camera.node.position = this.position;
        // this.camera.node.lookAt(this.eye, this.up);
        // this.camera._camera.dirty = true;
    }

    zoomTo(scale, x, y) {
        let position = cc.v2(
            cc.game.canvas.width / 2 / scale - document.body.clientWidth / scale,
            cc.game.canvas.height / 2 / scale - document.body.clientHeight / scale
        );

        this.position.set(cc.v3(position.x, position.y, 100));
        this.eye.set(cc.v3(position.x, position.y, 0));
        this.up.set(cc.v3(0, 1, 0));

        this.camera.orthoSize = cc.game.canvas.height / 2 / cc.view._scaleY / scale;
    }
}

module.exports = new Camrea();

window.camera = module.exports;
