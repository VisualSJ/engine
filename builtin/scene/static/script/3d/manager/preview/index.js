'use strict';
const NodeManager = require('../node');
const Scene = require('../scene');

let props = [
    '_lights',
    '_models',
    '_cameras',
]

class Preview {

    constructor() {
        this.canvas = document.getElementById('preview');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.width = this.canvas.clientWidth;
        this.canvas.height = this.height = this.canvas.clientHeight;
        this.rt = new cc.RenderTexture();
        this.rt.initWithSize(this.width, this.height, cc.gfx.RB_FMT_D24S8);
        this.data = new Uint8Array(this.width * this.height * 4);
        this.image = new ImageData(new Uint8ClampedArray(this.data.buffer), this.width, this.height);

        this.scene = new cc.renderer.Scene();
        this.lastUpdate = Date.now();
        cc.director.on(cc.Director.EVENT_AFTER_DRAW, () => {
            let now = Date.now();
            if (now - this.lastUpdate < 100) return;
            this.lastUpdate = now;
            this.onPostRender();
        });
        NodeManager.on('changed', this.extractActualScene.bind(this));
        Scene.on('open', this.extractActualScene.bind(this));
    }

    isActualSceneItem(item) {
        return cc.Layers.check(item.getNode().layer, cc.Layers.All);
    }

    extractActualScene() {
        let internal = cc.director._renderSystem._scene, preview = this.scene;
        // sync with current scene
        props.forEach(p => {
            let iList = internal[p], pList = preview[p];
            pList.reset();
            for (let i = 0; i < iList.length; i++) {
                let data = iList.data[i];
                if (this.isActualSceneItem(data))
                pList.push(data);
            }
        });
        // override camera fbos
        let cams = preview._cameras;
        for (let i = 0; i < cams.length; i++) {
            let cam = cams.data[i];
            cam.setFramebuffer(this.rt._framebuffer);
        }
        // TODO: user could select from camera list
        if (this.scene.getCameraCount() === 1)
            this.scene.setDebugCamera(this.scene.getCamera(0));
    }

    onResize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    onPostRender() {
        if (!this.scene.getDebugCamera()) return;

        cc.game._renderer.render(this.canvas, this.scene);
        this.rt.readPixels(this.data);

        this.ctx.putImageData(this.image, 0, 0);
    }
}

module.exports = new Preview();
