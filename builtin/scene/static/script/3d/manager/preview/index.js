'use strict';
const NodeManager = require('../node');
const Scene = require('../scene');
const { RenderScene } = require('./utils');

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

        this.scene = new RenderScene();
        this.lastUpdate = Date.now();
        cc.director.on(cc.Director.EVENT_AFTER_DRAW, () => {
            let now = Date.now();
            if (now - this.lastUpdate < 100) return;
            this.lastUpdate = now;
            this.onPostRender();
        });
        NodeManager.on('component-added', this.onAddComp.bind(this));
        NodeManager.on('component-removed', this.onRemoveComp.bind(this));
        Scene.on('open', (err, scene) => {
            this.scene = new RenderScene();
            scene.getComponentsInChildren(cc.CameraComponent).forEach(c => this.onAddComp(c));
            scene.getComponentsInChildren(cc.LightComponent).forEach(c => this.onAddComp(c));
            scene.getComponentsInChildren(cc.ModelComponent).forEach(c => this.onAddComp(c));
        });
    }

    onAddComp(comp) {
        if (!cc.Layers.check(comp.node.layer, cc.Layers.All)) return;
        if (comp instanceof cc.CameraComponent) {
            comp.onLoad(); let cam = comp._camera;
            cam.setFramebuffer(this.rt._framebuffer);
            this.scene.addCamera(cam);
            // TODO: user could select from camera list
            if (this.scene.getCameraCount() === 1)
                this.scene.setDebugCamera(this.scene.getCamera(0));
        } else if (comp instanceof cc.LightComponent) {
            this.scene.addLight(comp._light);
        } else if (comp instanceof cc.ModelComponent) {
            comp._models.forEach(m => this.scene.addModel(m));
        }
    }

    onRemoveComp(comp) {
        if (!cc.Layers.check(comp.node.layer, cc.Layer.All)) return;
        if (comp instanceof cc.CameraComponent) {
            this.scene.removeCamera(comp._camera);
        } else if (comp instanceof cc.LightComponent) {
            this.scene.removeLight(comp._light);
        } else if (comp instanceof cc.ModelComponent) {
            comp._models.forEach(m => this.scene.removeModel(m));
        }
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
